use std::{cmp::Ordering, collections::VecDeque};
use wasm_bindgen::prelude::*;
use oxc_parser::{ParseOptions, Parser};
use oxc_allocator::Allocator;
use oxc_span::{SourceType, Span};
use oxc_ast::{ast::{FunctionBody, UnaryOperator}, AstKind, AstType};
use oxc_span::GetSpan;
use oxc_semantic::{AstNode, Semantic, SemanticBuilder};

#[derive(Debug)]
enum InsertionText {
    Static(&'static str),
    Dynamic(String)
}

#[derive(Debug)]
struct Insertion {
    offset: u32,
    text: InsertionText,
    original_ordering: Option<u32>,
    reverse: bool,
}

impl Insertion {
    pub const fn new(offset: u32, text: &'static str, reverse: bool) -> Insertion {
        Insertion {
            offset,
            text: InsertionText::Static(text),
            original_ordering: None,
            reverse
        }
    }

    pub const fn new_dynamic(offset: u32, text: String, reverse: bool) -> Insertion {
        Insertion {
            offset,
            text: InsertionText::Dynamic(text),
            original_ordering: None,
            reverse
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
    vars: Vec<String>,
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

    fn sort(&mut self) {
        let mut i = 0;
        for insertion in &mut self.list {
            insertion.original_ordering = Some(i);
            i += 1;
        }
        self.list.make_contiguous().sort_by(|a, b| {
            if a.offset != b.offset {
                a.offset.cmp(&b.offset)
            } else if a.reverse && b.reverse {
                b.original_ordering.cmp(&a.original_ordering)
            } else if !a.reverse && !b.reverse {
                a.original_ordering.cmp(&b.original_ordering)
            } else if a.reverse {
                Ordering::Less
            } else {
                Ordering::Greater
            }
        });
    }
}

fn make_start_fn_insertion(offset: u32) -> Insertion {
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
, false)
}

fn make_end_fn_insertion(offset: u32) -> Insertion {
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
    , true)
}

fn fn_start_insertion(body: &FunctionBody, has_block_body: bool) -> InsertionList {
    let mut ret = InsertionList::new();
    let mut offset = body.span().start;
    if !has_block_body {
        ret.push_back(Insertion::new(offset, "{", false));
    } else {
        offset = offset.checked_add(1).unwrap();
    }
    ret.push_back(make_start_fn_insertion(offset));
    if !has_block_body {
        ret.push_back(Insertion::new(
            offset,
             "return (_synchronousReturnValue = ("
        , false));
    }
    ret
}
fn fn_end_insertion(body: &FunctionBody, has_block_body: bool) -> InsertionList {
    let mut ret = InsertionList::new();
    let mut offset = body.span().end;
    if has_block_body {
        offset = offset.checked_sub(1).unwrap();
    } else {
        ret.push_back(Insertion::new(offset, "), _functionState === 'async' ? _synchronousReturnValue : null);", true));
    }
    ret.push_back(make_end_fn_insertion(offset));
    if !has_block_body {
        ret.push_back(Insertion::new(offset, "}", true));
    }
    ret
}

fn collect_insertions(node: &AstNode, semantic: &Semantic) -> Result<InsertionList, &'static str> {
    let ast_nodes = semantic.nodes();
    let function_parent = ast_nodes.ancestor_kinds(node.id()).filter_map(|n| n.as_function()).find(|_| true);
    let mut insertions = InsertionList::new();
    let get_parent = |node: &AstNode| ast_nodes.parent_node(node.id());
    let get_parent_kind = |node: &AstNode| get_parent(node).map(|p| p.kind());
    let get_parent_type = |node: &AstNode| get_parent_kind(node).map(|p| p.ty()).unwrap_or(AstType::Program);

    let span = node.span();
    let kind = node.kind();
    let ty = kind.ty();
    {
        // XXX template literal handling?
        insertions.push_back(Insertion::new_dynamic(span.start,
            format!(" /*{ty:#?}*/ ")
        , false));
    }
    if let AstKind::Function(as_fn) = node.kind() {
        let body = as_fn.body.as_ref().ok_or("bad FnDecl without body")?;
        if !function_parent.is_some() {
            match &as_fn.id {
                None => {
                    insertions.push_back(Insertion::new(span.start, "/*no ident token*/", false));
                },
                Some(name) => {
                    insertions.push_back(Insertion::new(name.span().end, "__", false));
                    insertions.push_back(Insertion::new_dynamic(span.end,
                        format!(";\n_cr = {name} = {name}__;\n", name = name.name.as_str()), true
                    ));
                    insertions.add_variable(name.to_string());
                }
            }
        }
        if !as_fn.r#async {
            insertions.append(&mut fn_start_insertion(&body, true));
            insertions.append(&mut fn_end_insertion(&body, true));
        }
        return Ok(insertions);
    }
    if let AstKind::ArrowFunctionExpression(as_fn) = node.kind() {
        let body = &as_fn.body;
        if !as_fn.r#async {
            insertions.append(&mut fn_start_insertion(&body, !as_fn.expression));
            insertions.append(&mut fn_end_insertion(&body, !as_fn.expression));
        }
        return Ok(insertions);
    }
    if let AstKind::Class(as_class_decl) = node.kind() {
        if !function_parent.is_some() {
            if let Some(name) = as_class_decl.name() {
                insertions.push_back(Insertion::new_dynamic(span.start,
                format!("_cr = {name} = ", name = name.as_str())
                ,false));
                // XXX child insertions
                insertions.push_back(Insertion::new(span.end,
                    ";"
                ,true));
                insertions.add_variable(name.to_string());
            }
        }
        return Ok(insertions);
    }
    if let AstKind::VariableDeclaration(as_var_decl) = node.kind() {
        if get_parent_type(node) != AstType::ForStatementInit &&
           !function_parent.is_some() {
            let decl_span = Span::new(
                    as_var_decl.span().start,
                    as_var_decl.declarations.iter().map(|d| d.span().start).min().unwrap());

            insertions.push_back(Insertion::new(decl_span.start, "/*", false));
            insertions.push_back(Insertion::new(decl_span.end, "*/;(", false));
            for decl in &as_var_decl.declarations {
                if let Some(name) = decl.id.get_identifier_name() {
                    insertions.add_variable(name.to_string());
                }
            }
            insertions.push_back(Insertion::new(
                as_var_decl.declarations.iter().map(|d| d.span().end).max().unwrap(),
                ")", true));
        }
        return Ok(insertions);
    }
    if let AstKind::ExpressionStatement(as_expr_stmt) = node.kind() {
        let expr_span = as_expr_stmt.expression.span();
        insertions.push_back(Insertion::new(expr_span.start, ";", false ));
        if !function_parent.is_some() {
            insertions.push_back(Insertion::new(expr_span.start, "_cr = (", false));
            insertions.push_back(Insertion::new(expr_span.end, ")", true));
        }
        insertions.push_back(Insertion::new(expr_span.end, ";", true));
        return Ok(insertions);
    }
    if let AstKind::ReturnStatement(as_ret_stmt) = node.kind() {
        if function_parent.map_or(false, |f| !f.r#async) {
            if let Some(expr) = &as_ret_stmt.argument {
                insertions.push_back(
                    Insertion::new(expr.span().start, "(_synchronousReturnValue = (", false));
                insertions.push_back(
                    Insertion::new(expr.span().end, "), _functionState === 'async' ? _synchronousReturnValue : null);", true));
            }
        }
        return Ok(insertions);
    }

    // This is where expression handling starts
    let mut wrap_expr_span: Option<Span> = None;
    let mut is_named_typeof_rhs = false;
    let mut is_identifier = false;
    if let AstKind::IdentifierReference(expr) = node.kind() {
        is_identifier = true;
        let name = expr.name.as_str();
        let is_eval_this_super_reference = ["eval", "this", "super"].iter().any(|n| *n == name);
        if !is_eval_this_super_reference {
            wrap_expr_span = Some(span);
        }
    }
    if let AstKind::CallExpression(_) = node.kind() {
        wrap_expr_span = Some(span);
    }
    if let AstKind::ChainExpression(_) = node.kind() {
        if get_parent_type(node) != AstType::CallExpression {
            wrap_expr_span = Some(span);
        }
    }
    if let AstKind::MemberExpression(_) = node.kind() {
        if get_parent_type(node) != AstType::CallExpression {
            wrap_expr_span = Some(span);
        }
    }

    if let Some(AstKind::UnaryExpression(unary_parent)) = get_parent_kind(node) {
        if is_identifier && unary_parent.operator == UnaryOperator::Typeof {
            is_named_typeof_rhs = true;
        }
    }
    if get_parent_type(node) == AstType::ForStatementInit ||
       get_parent_type(node) == AstType::AssignmentTarget ||
       get_parent_type(node) == AstType::AwaitExpression ||
       get_parent_type(node) == AstType::FormalParameter {
        wrap_expr_span = None;
    }

    let get_source = |node: &dyn GetSpan| {
        let Span { start, end, .. } = node.span();
        return semantic.source_text()[(start as usize)..(end as usize)].to_string();
    };
    if is_named_typeof_rhs {
        insertions.push_back(Insertion::new_dynamic(get_parent_kind(node).unwrap().span().start,
            format!("(typeof {original} === 'undefined' ? 'undefined' : ", original = get_source(node)), false
        ));
    }
    if let Some(s) = wrap_expr_span {
        insertions.push_back(Insertion::new(s.start, "(_ex = ", false));
        insertions.push_back(Insertion::new(s.end, ", _isp(_ex) ? await _ex : _ex)", true));
    }
    if is_named_typeof_rhs {
        insertions.push_back(Insertion::new(span.end, ")", true));
    }

    return Ok(insertions);
}

#[wasm_bindgen]
pub fn async_rewrite(input: &str, with_debug_tags: bool) -> Result<String, String> {
    let allocator = Allocator::default();
    let source_type = SourceType::cjs();
    let parsed = Parser::new(&allocator, &input, source_type)
        .with_options(ParseOptions { parse_regular_expression: true, ..ParseOptions::default() })
        .parse();
    assert!(!parsed.panicked);
    let semantic_ret = SemanticBuilder::new().build(allocator.alloc(parsed.program));

    let mut insertions = InsertionList::new();
    let mut collected_insertions = InsertionList::new();
    for node in semantic_ret.semantic.nodes() {
        collected_insertions.append(&mut collect_insertions(node, &semantic_ret.semantic)?);
    }
    {
        let vars = &collected_insertions.vars;
        for var in vars {
            insertions.push_back(Insertion::new_dynamic(
                0,
                format!("var {};", var), false));
        }
    }
    let end = input.len().try_into().unwrap();
    insertions.push_back(Insertion::new(0, ";(() => { const __SymbolFor = Symbol.for;", false));
    insertions.push_back(make_start_fn_insertion(0));
    insertions.push_back(Insertion::new(0, "var _cr;", false));
    insertions.append(&mut collected_insertions);
    insertions.push_back(Insertion::new(end, ";\n return _synchronousReturnValue = _cr;", true));
    insertions.push_back(make_end_fn_insertion(input.len().try_into().unwrap()));
    insertions.push_back(Insertion::new(end, "})()", true));

    insertions.sort();

    let mut previous_offset = 0;
    let mut result = String::with_capacity(input.len() + insertions.list.iter().map(|s| s.len()).sum::<usize>());
    let mut debug_tag = "".to_string();
    for insertion in insertions.list {
        if insertion.offset != previous_offset {
            assert!(insertion.offset >= previous_offset);
            result.push_str(&input[previous_offset as usize..insertion.offset as usize]);
            previous_offset = insertion.offset.into();
        }

        let text;
        match &insertion.text {
            InsertionText::Dynamic(str) => { text = str.as_str(); }
            InsertionText::Static(str) => { text = str; }
        }

        if with_debug_tags {
            debug_tag = format!(
                "/*i{}@{}{}",
                insertion.original_ordering.unwrap(),
                u32::from(insertion.offset).to_string(),
                if text.contains("/*") { "" } else { "*/" }
            );
        }
        result.push_str(debug_tag.as_str());
        result.push_str(text);
        result.push_str(debug_tag.as_str());
    }
    result.push_str(&input[previous_offset as usize..]);

    Ok(result)
}
