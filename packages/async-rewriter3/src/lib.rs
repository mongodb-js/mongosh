use std::{borrow::Borrow, collections::VecDeque};
use wasm_bindgen::prelude::*;
use rslint_parser::{ast::{ArrowExpr, AssignExpr, CallExpr, ClassDecl, Expr, ExprOrBlock, ExprStmt, FnDecl, FnExpr, ObjectPatternProp, Pattern, PropName, ReturnStmt, UnaryExpr, VarDecl}, parse_text, AstNode, SyntaxNode, TextSize};

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
}

struct InsertionList {
    list: VecDeque<Insertion>,
    vars: Vec<String>
}

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
    match body {
        ExprOrBlock::Block(_) => { true }
        ExprOrBlock::Expr(_) => { false }
    }
}

fn make_start_fn_insertion(offset: TextSize) -> Insertion {
    Insertion::new(offset, r#"
    ;const _syntheticPromise = Symbol.for('@@mongosh.syntheticPromise');

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
             "return ("
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
        ret.push_back(Insertion::new(offset, ");"));
    }
    ret.push_back(make_end_fn_insertion(offset));
    if !is_block(body) {
        ret.push_back(Insertion::new(offset, "}"));
    }
    ret
}

fn add_all_variables_from_declaration(patterns: impl Iterator<Item = impl Borrow<Pattern>>) -> InsertionList {
    let mut ret = InsertionList::new();
    for pattern in patterns {
        match pattern.borrow() {
            Pattern::SinglePattern(p) => {
                p.name().map(|name| ret.add_variable(name.to_string()));
            },
            Pattern::RestPattern(p) => {
                let pat = p.pat();
                if pat.is_some() {
                    ret.append(&mut add_all_variables_from_declaration([&pat.unwrap()].into_iter()));
                }
            },
            Pattern::AssignPattern(p) => {
                let key = p.key();
                if key.is_some() {
                    ret.append(&mut add_all_variables_from_declaration([&key.unwrap()].into_iter()));
                }
            },
            Pattern::ObjectPattern(p) => {
                for element in p.elements() {
                    match element {
                        ObjectPatternProp::AssignPattern(p) => {
                            ret.append(&mut add_all_variables_from_declaration([&Pattern::AssignPattern(p)].into_iter()));
                        }
                        ObjectPatternProp::KeyValuePattern(p) => {
                            if p.key().is_some() {
                                match p.key().unwrap() {
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

fn collect_insertions(node: &SyntaxNode, nesting_depth: u32) -> InsertionList {
    let is_function_node = FnExpr::can_cast(node.kind()) || FnDecl::can_cast(node.kind()) || ArrowExpr::can_cast(node.kind());
    let has_function_parent = nesting_depth > 0;
    let mut insertions = InsertionList::new();
    for child in node.children() {
        let range = child.text_range();
        let child_insertions = &mut collect_insertions(&child, nesting_depth + if is_function_node { 1 } else { 0 });
        if FnDecl::can_cast(child.kind()) {
            let as_fn = FnDecl::cast(child).unwrap();
            let body = ExprOrBlock::Block(as_fn.body().unwrap());
            if !has_function_parent {
                match as_fn.ident_token() {
                    None => {},
                    Some(name) => {
                        insertions.push_back(Insertion::new_dynamic(range.start(),
                            [name.text(), " = "].concat()
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
        if ClassDecl::can_cast(child.kind()) && !has_function_parent {
            let as_class_decl = ClassDecl::cast(child).unwrap();
            match as_class_decl.name() {
                None => {},
                Some(name) => {
                    insertions.push_back(Insertion::new_dynamic(range.start(),
                        [name.text().as_str(), " = "].concat()
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
            if expr_range.is_some() {
                insertions.push_back(Insertion::new(expr_range.unwrap().start(), "_cr = ("));
            }
            insertions.append(child_insertions);
            if expr_range.is_some() {
                insertions.push_back(Insertion::new(expr_range.unwrap().end(), ")"));
            }
            continue;
        }

        match Expr::cast(child) {
            None => {
                insertions.append(child_insertions);
            }
            Some(as_expr) => {
                let is_returned_expression = ReturnStmt::can_cast(as_expr.syntax().parent().unwrap().kind());
                let is_called_expression = CallExpr::can_cast(as_expr.syntax().parent().unwrap().kind());
                let mut is_dot_call_expression = false;
                if is_returned_expression {
                    insertions.push_back(Insertion::new(range.start(), "(_synchronousReturnValue = "));
                }
                let is_lhs_of_assign_expr = (AssignExpr::can_cast(as_expr.syntax().parent().unwrap().kind()) &&
                    AssignExpr::cast(as_expr.syntax().parent().unwrap()).unwrap().lhs().unwrap().syntax().text_range() ==
                    as_expr.syntax().text_range()) || UnaryExpr::can_cast(as_expr.syntax().parent().unwrap().kind());

                if !is_lhs_of_assign_expr {
                    insertions.push_back(Insertion::new(range.start(), "(_ex = "));
                }

                match as_expr {
                    Expr::ArrowExpr(as_fn) => {
                        if as_fn.async_token().is_none() {
                            let body = as_fn.body().unwrap();
                            insertions.append(&mut fn_start_insertion(&body));
                            insertions.append(child_insertions);
                            insertions.append(&mut fn_end_insertion(&body));
                        }
                    }
                    Expr::FnExpr(as_fn) => {
                        if as_fn.async_token().is_none() {
                            let body = ExprOrBlock::Block(as_fn.body().unwrap());
                            insertions.append(&mut fn_start_insertion(&body));
                            insertions.append(child_insertions);
                            insertions.append(&mut fn_end_insertion(&body));
                        }
                    },
                    Expr::DotExpr(_) => {
                        if is_called_expression {
                            is_dot_call_expression = true;
                            insertions.pop_back();
                        }
                        insertions.append(child_insertions);
                    }
                    _ => {
                        insertions.append(child_insertions);
                    },
                }
                if !is_dot_call_expression && !is_lhs_of_assign_expr {
                    insertions.push_back(Insertion::new(range.end(), ", _isp(_ex) ? await _ex : _ex)"));
                }
                if is_returned_expression {
                    insertions.push_back(Insertion::new(
                        range.end(),
                        ", _functionState === 'async' ? _synchronousReturnValue : null)"
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
    insertions.push_back(Insertion::new(TextSize::new(0), "(() => {"));
    insertions.push_back(make_start_fn_insertion(TextSize::new(0)));
    insertions.push_back(Insertion::new(TextSize::new(0), "var _cr;"));
    insertions.append(&mut collected_insertions);
    insertions.push_back(Insertion::new(TextSize::new(end), "; return _synchronousReturnValue = _cr;"));
    insertions.push_back(make_end_fn_insertion(input.len().try_into().unwrap()));
    insertions.push_back(Insertion::new(TextSize::new(end), "})()"));

    let mut i = 0;
    for insertion in &mut insertions.list {
        i += 1;
        insertion.original_ordering = Some(i);
    }
    insertions.list.make_contiguous().sort_by(|a, b| a.offset.cmp(&b.offset));

    let mut result = input.to_string();
    let mut debug_tag = "".to_string();
    for insertion in insertions.list.iter().rev() {
        let text;
        match &insertion.text {
            InsertionText::Dynamic(str) => { text = str.as_str(); }
            InsertionText::Static(str) => { text = str; }
        }
        let (before, after) = result.split_at(insertion.offset.into());
        if with_debug_tags {
            debug_tag = [
                "/*i", insertion.original_ordering.unwrap().to_string().as_str(), "@",
                u32::from(insertion.offset).to_string().as_str(),
                if text.contains("/*") { "" } else { "*/" }
            ].concat();
        }
        result = [before, debug_tag.as_str(), text, debug_tag.as_str(), after].concat();
    }

    result
}
