use std::{borrow::Borrow, collections::VecDeque, fmt::Debug};
use wasm_bindgen::prelude::*;
use rslint_parser::{ast::{ArrowExpr, AssignExpr, BracketExpr, BreakStmt, CallExpr, ClassDecl, Constructor, ContinueStmt, DotExpr, Expr, ExprOrBlock, ExprStmt, FnDecl, FnExpr, ForStmtInit, GroupingExpr, Literal, Method, NameRef, ObjectPatternProp, ParameterList, Pattern, PropName, ReturnStmt, ThisExpr, UnaryExpr, VarDecl}, parse_text, AstNode, SyntaxKind, SyntaxNode, TextSize};

#[derive(Debug)]
enum InsertionText {
    Static(&'static str),
    Dynamic(String)
}

#[derive(Debug)]
struct Insertion {
    offset: TextSize,
    text: InsertionText,
    original_ordering: Option<u32>
}

impl Insertion {
    pub const fn new(offset: TextSize, text: &'static str) -> Insertion {
        Insertion {
            offset,
            text: InsertionText::Static(text),
            original_ordering: None
        }
    }

    pub const fn new_dynamic(offset: TextSize, text: String) -> Insertion {
        Insertion {
            offset,
            text: InsertionText::Dynamic(text),
            original_ordering: None
        }
    }

    pub fn len(&self) -> usize {
        match &self.text {
            InsertionText::Static(str) => str.len(),
            InsertionText::Dynamic(str) => str.len()
        }
    }
}

struct InsertionList {
    list: VecDeque<Insertion>,
    vars: Vec<String>
}

#[allow(dead_code)]
impl InsertionList {
    pub const fn new() -> InsertionList {
        InsertionList {
            list: VecDeque::new(),
            vars: Vec::new()
        }
    }

    fn append(&mut self, other: &mut Self) {
        self.list.append(&mut other.list);
        self.vars.append(&mut other.vars);
    }

    fn push_back(&mut self, insertion: Insertion) {
        self.list.push_back(insertion);
    }

    fn pop_back(&mut self) {
        self.list.pop_back();
    }

    fn add_variable(&mut self, variable: String) {
        self.vars.push(variable);
    }
}

fn is_block(body: &ExprOrBlock) -> bool {
    return matches!(body, ExprOrBlock::Block(_));
}

fn make_start_fn_insertion(offset: TextSize) -> Insertion {
    Insertion::new(offset, r#"
    ;const _syntheticPromise = __SymbolFor('@@mongosh.syntheticPromise');

    function _markSyntheticPromise(p) {
        return Object.defineProperty(p, _syntheticPromise, {
            value: true,
        });
    }

    function _isp(p) {
        return p && p[_syntheticPromise];
    }

    let _functionState = 'sync', _synchronousReturnValue, _ex;

    const _asynchronousReturnValue = (async () => {
    try {
    "#
)
}

fn make_end_fn_insertion(offset: TextSize) -> Insertion {
    Insertion::new(
        offset,
        r#"
        } catch (err) {
            if (_functionState === 'sync') {
                // Forward synchronous exceptions.
                _synchronousReturnValue = err;
                _functionState = 'threw';
            } else {
                throw err;
            }
            } finally {
            if (_functionState !== 'threw') {
                _functionState = 'returned';
            }
        }

        })();

        if (_functionState === 'returned') {
            return _synchronousReturnValue;
        } else if (_functionState === 'threw') {
            throw _synchronousReturnValue;
        }

        _functionState = 'async';
        return _markSyntheticPromise(_asynchronousReturnValue);
        "#
    )
}

fn fn_start_insertion(body: &ExprOrBlock) -> InsertionList {
    let mut ret = InsertionList::new();
    let mut offset = body.syntax().text_range().start();
    if !is_block(body) {
        ret.push_back(Insertion::new(offset, "{"));
    } else {
        offset = offset.checked_add(1.into()).unwrap();
    }
    ret.push_back(make_start_fn_insertion(offset));
    if !is_block(body) {
        ret.push_back(Insertion::new(
            offset,
             "return (_synchronousReturnValue = ("
        ));
    }
    ret
}
fn fn_end_insertion(body: &ExprOrBlock) -> InsertionList {
    let mut ret = InsertionList::new();
    let mut offset = body.syntax().text_range().end();
    if is_block(body) {
        offset = offset.checked_sub(1.into()).unwrap();
    } else {
        ret.push_back(Insertion::new(offset, "), _functionState === 'async' ? _synchronousReturnValue : null);"));
    }
    ret.push_back(make_end_fn_insertion(offset));
    if !is_block(body) {
        ret.push_back(Insertion::new(offset, "}"));
    }
    ret
}

fn is_in_async_function(node: &SyntaxNode) -> bool {
    return node.parent().map_or(false, |parent: SyntaxNode| {
        if FnExpr::can_cast(parent.kind()) {
            return FnExpr::cast(parent).unwrap().async_token().is_some();
        }
        if FnDecl::can_cast(parent.kind()) {
            return FnDecl::cast(parent).unwrap().async_token().is_some();
        }
        if ArrowExpr::can_cast(parent.kind()) {
            return ArrowExpr::cast(parent).unwrap().async_token().is_some();
        }
        if Method::can_cast(parent.kind()) {
            return Method::cast(parent).unwrap().async_token().is_some();
        }
        if Constructor::can_cast(parent.kind()) {
            return false;
        }
        assert!(!is_function_node(&parent));
         return is_in_async_function(&parent)
    });
}

fn is_function_node(node: &SyntaxNode) -> bool {
    return FnExpr::can_cast(node.kind()) || FnDecl::can_cast(node.kind()) || ArrowExpr::can_cast(node.kind()) || Method::can_cast(node.kind()) || Constructor::can_cast(node.kind());
}

fn add_all_variables_from_declaration(patterns: impl Iterator<Item = impl Borrow<Pattern>>) -> InsertionList {
    let mut ret = InsertionList::new();
    for pattern in patterns {
        match pattern.borrow() {
            Pattern::SinglePattern(p) => {
                p.name().map(|name| ret.add_variable(name.to_string()));
            },
            Pattern::RestPattern(p) => {
                if let Some(pat) = p.pat() {
                    ret.append(&mut add_all_variables_from_declaration([&pat].into_iter()));
                }
            },
            Pattern::AssignPattern(p) => {
                if let Some(key) = p.key() {
                    ret.append(&mut add_all_variables_from_declaration([&key].into_iter()));
                }
            },
            Pattern::ObjectPattern(p) => {
                for element in p.elements() {
                    match element {
                        ObjectPatternProp::AssignPattern(p) => {
                            ret.append(&mut add_all_variables_from_declaration([&Pattern::AssignPattern(p)].into_iter()));
                        }
                        ObjectPatternProp::KeyValuePattern(p) => {
                            if let Some(key) = p.key() {
                                match key {
                                    PropName::Ident(ident) => {
                                        ret.add_variable(ident.text());
                                    }
                                    PropName::Computed(_) => panic!(),
                                    PropName::Literal(_) => panic!(),
                                }
                            }
                        },
                        ObjectPatternProp::RestPattern(p) => {
                            ret.append(&mut add_all_variables_from_declaration([&Pattern::RestPattern(p)].into_iter()));
                        },
                        ObjectPatternProp::SinglePattern(p) => {
                            ret.append(&mut add_all_variables_from_declaration([&Pattern::SinglePattern(p)].into_iter()));
                        },
                    }
                }
            },
            Pattern::ArrayPattern(p) => {
                ret.append(&mut add_all_variables_from_declaration(p.elements()));
            },
            Pattern::ExprPattern(_) => panic!(),
        }
    }
    ret
}

fn is_name_ref(syntax_node: &SyntaxNode, names: Option<&'static[&'static str]>) -> bool {
    if !NameRef::can_cast(syntax_node.kind()) {
        if GroupingExpr::can_cast(syntax_node.kind()) {
            return is_name_ref(GroupingExpr::cast(syntax_node.clone()).unwrap().inner().unwrap().syntax(), names);
        }
        return false;
    }
    if names.is_none() {
        return true;
    }
    return names.unwrap().iter().any(|t| *t == syntax_node.text().to_string().as_str())
}

fn collect_insertions(node: &SyntaxNode, nesting_depth: u32) -> InsertionList {
    let has_function_parent = nesting_depth > 0;
    let mut insertions = InsertionList::new();
    for child in node.children() {
        let range = child.text_range();
        let child_insertions = &mut collect_insertions(&child, nesting_depth + if is_function_node(node) { 1 } else { 0 });
        {
            let kind = child.kind();
            if kind != SyntaxKind::TEMPLATE_ELEMENT {
                insertions.push_back(Insertion::new_dynamic(range.start(),
                    [" /*", format!("{kind:#?}").as_str(), "*/ "].concat()
                ));
            }
        }
        if FnDecl::can_cast(child.kind()) {
            let as_fn = FnDecl::cast(child).unwrap();
            let body = ExprOrBlock::Block(as_fn.body().unwrap());
            if !has_function_parent {
                match as_fn.ident_token().or(as_fn.name().and_then(|n| n.ident_token())) {
                    None => {
                        insertions.push_back(Insertion::new(range.start(), "/*no ident token*/"));
                    },
                    Some(name) => {
                        insertions.push_back(Insertion::new(name.text_range().end(), "__"));
                        insertions.push_back(Insertion::new_dynamic(range.end(),
                            [";\n_cr = ", name.text(), " = ", name.text(), "__"].concat()
                        ));
                        insertions.add_variable(name.to_string());
                    }
                }
            }
            if as_fn.async_token().is_none() {
                insertions.append(&mut fn_start_insertion(&body));
                insertions.append(child_insertions);
                insertions.append(&mut fn_end_insertion(&body));
            } else {
                insertions.append(child_insertions);
            }
            continue;
        }
        if Method::can_cast(child.kind()) {
            let as_fn = Method::cast(child).unwrap();
            let body = ExprOrBlock::Block(as_fn.body().unwrap());
            if as_fn.async_token().is_none() {
                insertions.append(&mut fn_start_insertion(&body));
                insertions.append(child_insertions);
                insertions.append(&mut fn_end_insertion(&body));
            } else {
                insertions.append(child_insertions);
            }
            continue;
        }
        if Constructor::can_cast(child.kind()) {
            let as_fn = Constructor::cast(child).unwrap();
            let body = ExprOrBlock::Block(as_fn.body().unwrap());
            insertions.append(&mut fn_start_insertion(&body));
            insertions.append(child_insertions);
            insertions.append(&mut fn_end_insertion(&body));
            continue;
        }
        if ClassDecl::can_cast(child.kind()) && !has_function_parent {
            let as_class_decl = ClassDecl::cast(child).unwrap();
            match as_class_decl.name() {
                None => {},
                Some(name) => {
                    insertions.push_back(Insertion::new_dynamic(range.start(),
                        ["_cr = ", name.text().as_str(), " = "].concat()
                    ));
                    insertions.add_variable(name.to_string());
                }
            }
            insertions.append(child_insertions);
            continue;
        }
        if VarDecl::can_cast(child.kind()) && !has_function_parent {
            let as_var_decl = VarDecl::cast(child).unwrap();
            let declarator_range =
                as_var_decl.const_token().map(|t| t.text_range())
                .or(as_var_decl.let_token().map(|t| t.text_range()))
                .or(as_var_decl.var_token().map(|t| t.text_range()));

            if declarator_range.is_some() {
                insertions.push_back(Insertion::new(declarator_range.unwrap().start(), "/*"));
                insertions.push_back(Insertion::new(declarator_range.unwrap().end(), "*/("));
                insertions.append(&mut add_all_variables_from_declaration(as_var_decl.declared().filter_map(|d| d.pattern())));
            }
            insertions.append(child_insertions);
            if declarator_range.is_some() {
                insertions.push_back(Insertion::new(as_var_decl.declared().map(|d| d.range().end()).max().unwrap(), ")"));
            }
            continue;
        }
        if ExprStmt::can_cast(child.kind()) && !has_function_parent {
            let as_expr_stmt = ExprStmt::cast(child).unwrap();
            let expr_range = as_expr_stmt.expr().map(|e| e.syntax().text_range());
            if let Some(start) = expr_range.map(|r| r.start()) {
                insertions.push_back(Insertion::new(start, "_cr = ("));
            }
            insertions.append(child_insertions);
            if let Some(end) = expr_range.map(|r| r.end()) {
                insertions.push_back(Insertion::new(end, ")"));
            }
            continue;
        }

        match Expr::cast(child) {
            None => {
                insertions.append(child_insertions);
            }
            Some(as_expr) => {
                let is_eval_this_super_reference = is_name_ref(as_expr.syntax(), Some(&["eval", "this", "super"])) ||
                    ThisExpr::can_cast(as_expr.syntax().kind());

                let is_returned_expression = ReturnStmt::can_cast(as_expr.syntax().parent().unwrap().kind());
                let is_called_expression = CallExpr::can_cast(as_expr.syntax().parent().unwrap().kind());
                let is_expr_in_async_function = is_in_async_function(as_expr.syntax());
                let is_dot_call_expression = is_called_expression &&
                    (DotExpr::can_cast(as_expr.syntax().kind()) || BracketExpr::can_cast(as_expr.syntax().kind()));

                if is_returned_expression && !is_expr_in_async_function {
                    insertions.push_back(Insertion::new(range.start(), "(_synchronousReturnValue = ("));
                }

                let is_unary_rhs = UnaryExpr::can_cast(as_expr.syntax().parent().unwrap().kind());
                let is_typeof_rhs = is_unary_rhs && UnaryExpr::cast(as_expr.syntax().parent().unwrap()).unwrap().text().starts_with("typeof");
                let is_named_typeof_rhs = is_typeof_rhs && is_name_ref(as_expr.syntax(), None);
                let is_lhs_of_assign_expr = (AssignExpr::can_cast(as_expr.syntax().parent().unwrap().kind()) &&
                    AssignExpr::cast(as_expr.syntax().parent().unwrap()).unwrap().lhs().unwrap().syntax().text_range() ==
                    as_expr.syntax().text_range()) ||
                    (is_unary_rhs && !is_typeof_rhs);
                let is_argument_default_value = ParameterList::can_cast(as_expr.syntax().parent().unwrap().parent().unwrap().kind());
                let is_literal = Literal::can_cast(as_expr.syntax().kind());
                let is_label_in_continue_or_break = is_name_ref(as_expr.syntax(), None) &&
                ContinueStmt::can_cast(as_expr.syntax().parent().unwrap().kind()) || BreakStmt::can_cast(as_expr.syntax().parent().unwrap().kind());
                let is_for_in_of_lvalue =
                ForStmtInit::can_cast(as_expr.syntax().parent().unwrap().kind());
                let wants_implicit_await_wrapper =
                    !is_lhs_of_assign_expr &&
                    !is_argument_default_value &&
                    !is_eval_this_super_reference &&
                    !is_literal &&
                    !is_label_in_continue_or_break &&
                    !is_for_in_of_lvalue &&
                    !is_dot_call_expression;

                if is_named_typeof_rhs {
                    insertions.push_back(Insertion::new_dynamic(as_expr.syntax().parent().unwrap().text_range().start(), [
                        "(typeof ", as_expr.syntax().text().to_string().as_str(), " === 'undefined' ? 'undefined' : "
                    ].concat()));
                }

                if wants_implicit_await_wrapper {
                    insertions.push_back(Insertion::new(range.start(), "(_ex = "));
                }

                match as_expr {
                    Expr::ArrowExpr(as_fn) => {
                        if as_fn.async_token().is_none() {
                            let body = as_fn.body().unwrap();
                            insertions.append(&mut fn_start_insertion(&body));
                            insertions.append(child_insertions);
                            insertions.append(&mut fn_end_insertion(&body));
                        } else {
                            insertions.append(child_insertions);
                        }
                    }
                    Expr::FnExpr(as_fn) => {
                        if as_fn.async_token().is_none() {
                            let body = ExprOrBlock::Block(as_fn.body().unwrap());
                            insertions.append(&mut fn_start_insertion(&body));
                            insertions.append(child_insertions);
                            insertions.append(&mut fn_end_insertion(&body));
                        } else {
                            insertions.append(child_insertions);
                        }
                    },
                    _ => {
                        insertions.append(child_insertions);
                    },
                }
                if wants_implicit_await_wrapper {
                    insertions.push_back(Insertion::new(range.end(), ", _isp(_ex) ? await _ex : _ex)"));
                }
                if is_named_typeof_rhs {
                    insertions.push_back(Insertion::new(range.end(), ")"));
                }
                if is_returned_expression && !is_expr_in_async_function {
                    insertions.push_back(Insertion::new(
                        range.end(),
                        "), _functionState === 'async' ? _synchronousReturnValue : null)"
                    ));
                }
            }
        }
    }
    return insertions;
}

#[wasm_bindgen]
pub fn async_rewrite(input: String, with_debug_tags: bool) -> String {
    let parsed = parse_text(input.as_str(), 0);
    let mut insertions = InsertionList::new();
    let mut collected_insertions = collect_insertions(&parsed.syntax(), 0);
    {
        let vars = &collected_insertions.vars;
        for var in vars {
            insertions.push_back(Insertion::new_dynamic(TextSize::new(0), [
                "var ", var.as_str(), ";"
            ].concat()));
        }
    }
    let end = input.len().try_into().unwrap();
    insertions.push_back(Insertion::new(TextSize::new(0), "(() => { const __SymbolFor = Symbol.for;"));
    insertions.push_back(make_start_fn_insertion(TextSize::new(0)));
    insertions.push_back(Insertion::new(TextSize::new(0), "var _cr;"));
    insertions.append(&mut collected_insertions);
    insertions.push_back(Insertion::new(TextSize::new(end), ";\n return _synchronousReturnValue = _cr;"));
    insertions.push_back(make_end_fn_insertion(input.len().try_into().unwrap()));
    insertions.push_back(Insertion::new(TextSize::new(end), "})()"));

    let mut i = 0;
    for insertion in &mut insertions.list {
        i += 1;
        insertion.original_ordering = Some(i);
    }
    insertions.list.make_contiguous().sort_by(|a, b| a.offset.cmp(&b.offset));

    let mut previous_offset = 0;
    let mut result = String::with_capacity(input.len() + insertions.list.iter().map(|s| s.len()).sum::<usize>());
    let mut debug_tag = "".to_string();
    for insertion in insertions.list.iter() {
        if usize::from(insertion.offset) != previous_offset {
            assert!(usize::from(insertion.offset) >= previous_offset);
            result.push_str(&input[previous_offset..insertion.offset.into()]);
            previous_offset = insertion.offset.into();
        }

        let text;
        match &insertion.text {
            InsertionText::Dynamic(str) => { text = str.as_str(); }
            InsertionText::Static(str) => { text = str; }
        }

        if with_debug_tags {
            debug_tag = [
                "/*i", insertion.original_ordering.unwrap().to_string().as_str(), "@",
                u32::from(insertion.offset).to_string().as_str(),
                if text.contains("/*") { "" } else { "*/" }
            ].concat();
        }
        result.push_str(debug_tag.as_str());
        result.push_str(text);
        result.push_str(debug_tag.as_str());
    }
    result.push_str(&input[previous_offset..]);

    result
}
