use oxc_allocator::Allocator;
use oxc_ast::{
    ast::{
        ArrowFunctionExpression, Expression, Function, FunctionBody, IdentifierReference,
        ParenthesizedExpression, UnaryOperator,
    },
    AstKind, AstType,
};
use oxc_parser::{ParseOptions, Parser};
use oxc_semantic::{AstNode, Semantic, SemanticBuilder};
use oxc_span::GetSpan;
use oxc_span::{SourceType, Span};
use std::{borrow::Cow, cmp::Ordering, collections::VecDeque};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Debug, PartialEq, PartialOrd, Clone, Copy, Eq)]
pub enum DebugLevel {
    None,
    TypesOnly,
    Verbose,
}

/// Represents a single piece of text we want to insert into the original JS source.
#[derive(Debug)]
struct Insertion {
    /// The offset in the original source where this insertion should be made.
    offset: u32,
    /// The text to insert. Can be a static string or an owned string (from e.g. String).
    text: Cow<'static, str>,
    /// Not created by callers. This is used to keep track of the original insertion order
    /// into an `InsertionList` for sorting the list.
    original_ordering: Option<u32>,
    /// `true` for closing insertions that should be inserted in reverse order.
    /// (Consider that nodes in the AST are traversed in DFS order, so insertions from a
    /// child node come after the parent's insertions but, in the case of 'closing' insertions,
    /// should be added later.)
    reverse: bool,
}

impl Insertion {
    /// Creates a new insertion.
    pub fn new(offset: u32, text: impl Into<Cow<'static, str>>, reverse: bool) -> Insertion {
        Insertion {
            offset,
            text: text.into(),
            original_ordering: None,
            reverse,
        }
    }

    /// Utility to create a pair of insertions for matching opening and closing tags.
    pub fn pair(
        node: impl GetSpan,
        open: impl Into<Cow<'static, str>>,
        close: impl Into<Cow<'static, str>>,
    ) -> (Insertion, Insertion) {
        let span = node.span();
        let open_insertion = Insertion::new(span.start, open, false);
        let close_insertion = Insertion::new(span.end, close, true);
        (open_insertion, close_insertion)
    }

    pub fn len(&self) -> usize {
        self.text.len()
    }
}

/// Keep track of all insertions we want to make in the original source.
struct InsertionList {
    /// The list of insertions to make.
    list: VecDeque<Insertion>,
    /// The list of variables we need to declare at the start of the source code
    /// (e.g. definitions we want to pull into the global scope despite wrapping
    /// the original source code in an IIFE).
    vars: Vec<String>,
}

#[allow(dead_code)]
impl InsertionList {
    pub const fn new() -> InsertionList {
        InsertionList {
            list: VecDeque::new(),
            vars: Vec::new(),
        }
    }

    fn append(&mut self, other: &mut Self) {
        self.list.append(&mut other.list);
        self.vars.append(&mut other.vars);
    }

    fn push_back(&mut self, insertion: Insertion) {
        self.list.push_back(insertion);
    }

    fn push_pair(&mut self, insertions: (Insertion, Insertion)) {
        self.push_back(insertions.0);
        self.push_back(insertions.1);
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

fn make_fn_insertions(span: impl GetSpan) -> (Insertion, Insertion) {
    // Set up shared code for non-async function start logic.
    // The duplication of these shared functions can be heavily reduced
    // as a future optimization, since it only matters that they are in scope.
    // The JS async rewriter also automatically generated names for these helpers
    // that were guaranteed not to conflict with any user code, which this code
    // does currently not do.
    // The core "magic" of this code is that we the inner `async` IIFE
    // can return synchronously without ever `await`ing anything, and we know
    // whether that happens or not and can adjust the return type of the outer
    // function accordingly.
    Insertion::pair(
        span,
        r#"
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
    try {"#,
        r#"
        } catch (err) {
            if (_functionState === 'sync') {
                /* Forward synchronous exceptions. */
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
        "#,
    )
}

fn add_fn_insertions(insertions: &mut InsertionList, body: &FunctionBody, has_block_body: bool) {
    let span = body.span();
    // Ensure that the function body is a block statement. Is a no-op for non-arrow
    // functions, but changes behavior of expression-returning arrow functions.
    insertions.push_pair(Insertion::pair(span, "{", "}"));
    insertions.push_pair(make_fn_insertions(span));
    if !has_block_body {
        // This is an expression-returning arrow function without a body,
        // so we need to add an explicit `return` statement.
        insertions.push_pair(Insertion::pair(
            span,
            "return (_synchronousReturnValue = (",
            "), _functionState === 'async' ? _synchronousReturnValue : null);",
        ));
    }
}

/// Utility for `get_identifier_reference`. Given a parenthesized expression,
/// return the identifier reference it wraps, if it does.
/// (e.g. `((foo))` -> `foo`)
fn get_identifier_reference_from_parenthesized_expression<'a>(
    node: &'a ParenthesizedExpression<'a>,
) -> Option<&'a IdentifierReference<'a>> {
    match node.expression {
        Expression::Identifier(ref expr) => Some(expr),
        Expression::ParenthesizedExpression(ref expr) => {
            get_identifier_reference_from_parenthesized_expression(expr)
        }
        _ => None,
    }
}

/// Return the identifier reference of a node, if it is an identifier reference or a
/// parenthesized expression wrapping one (e.g. `foo` or `(foo)`).
fn get_identifier_reference<'a>(node: &AstNode<'a>) -> Option<&'a IdentifierReference<'a>> {
    if let AstKind::IdentifierReference(expr) = node.kind() {
        Some(expr)
    } else if let AstKind::ParenthesizedExpression(expr) = node.kind() {
        get_identifier_reference_from_parenthesized_expression(expr)
    } else {
        None
    }
}

enum AnyFunctionParent<'a> {
    Function(&'a Function<'a>),
    ArrowFunction(&'a ArrowFunctionExpression<'a>),
}

/// Collect all insertions for a given node.
/// This is the main function that does the work of rewriting the source code.
fn collect_insertions(node: &AstNode, semantic: &Semantic, debug_level: DebugLevel) -> Result<InsertionList, &'static str> {
    let ast_nodes = &semantic.nodes();
    // Look up the nearest function parent, if any.
    let function_parent = &ast_nodes
        .ancestor_kinds(node.id())
        .skip(1) // Skip the current node. The oxc docs lie about it not being included.
        .filter_map(|n| {
            n.as_function()
                .map(|f| AnyFunctionParent::Function(f))
                .or_else(|| {
                    n.as_arrow_function_expression()
                        .map(|f| AnyFunctionParent::ArrowFunction(f))
                })
        })
        .find(|_| true);
    let function_parent_is_async = match function_parent {
        Some(AnyFunctionParent::Function(f)) => f.r#async,
        Some(AnyFunctionParent::ArrowFunction(f)) => f.r#async,
        None => false,
    };

    // Helpers to get the parent node and its kind (~ full node information)/type.
    let get_parent = |node: &AstNode| ast_nodes.parent_node(node.id());
    let get_parent_kind = |node: &AstNode| get_parent(node).map(|p| p.kind());
    let get_parent_type = |node: &AstNode| {
        get_parent_kind(node)
            .map(|p| p.ty())
            .unwrap_or(AstType::Program)
    };

    // Helpers to get the source text of a given node.
    let get_source = |node: &dyn GetSpan| {
        let Span { start, end, .. } = node.span();
        return semantic.source_text()[(start as usize)..(end as usize)].to_string();
    };

    let span = node.span();

    let mut insertions = InsertionList::new();

    if debug_level >= DebugLevel::TypesOnly {
        // Debugging utility -- insert the type of the node into the generated source.
        let ty = node.kind().ty();
        insertions.push_back(Insertion::new(span.start, format!(" /*{ty:#?}*/ "), false));
    }
    if let AstKind::Function(as_fn) = node.kind() {
        let body = as_fn.body.as_ref().ok_or("bad FnDecl without body")?;
        if !function_parent.is_some() {
            match &as_fn.id {
                None => {
                    insertions.push_back(Insertion::new(span.start, "/*no ident token*/", false));
                }
                Some(name) => {
                    // `function foo() {}` -> `var foo; ... function foo__() {}; _cr = foo = foo__;`
                    // so that if somebody writes `function foo() {}` we consider it a valid completion record.
                    insertions.push_pair(
                        Insertion::pair(
                            Span::new(name.span().end, span.end),
                            "__",
                            format!(";\n_cr = {name} = {name}__;\n", name = name.name.as_str())));
                    insertions.add_variable(name.to_string());
                }
            }
        }
        if !as_fn.r#async {
            add_fn_insertions(&mut insertions, body, true);
        }
        // TODO: For both async and non-async functions, we should still add helpers
        // for handling pseudo-synchronous code, like the Babel version does.
        return Ok(insertions);
    }
    if let AstKind::ArrowFunctionExpression(as_fn) = node.kind() {
        let body = &as_fn.body;
        if !as_fn.r#async {
            add_fn_insertions(&mut insertions, body, !as_fn.expression);
        }
        return Ok(insertions);
    }
    if let AstKind::Class(as_class_decl) = node.kind() {
        if !function_parent.is_some() {
            if let Some(name) = as_class_decl.name() {
                // `class foo {}` -> `var foo; ... _cr = foo = class foo {};`
                // Similar to function declarations.
                insertions.push_pair(Insertion::pair(
                    span,
                    format!("_cr = {name} = ", name = name.as_str()),
                    ";",
                ));
                insertions.add_variable(name.to_string());
            }
        }
        return Ok(insertions);
    }
    if let AstKind::VariableDeclaration(as_var_decl) = node.kind() {
        // For top-level variables, we extract the variable names to the outermost scope
        // and comment out the declarator, i.e. `let foo = 42;` -> `var foo; ... /* let */ (foo = 42);`
        if get_parent_type(node) != AstType::ForStatementInit && !function_parent.is_some() {
            let decl_span = Span::new(
                as_var_decl.span().start,
                as_var_decl
                    .declarations
                    .iter()
                    .map(|d| d.span().start)
                    .min()
                    .unwrap(),
            );

            insertions.push_pair(Insertion::pair(decl_span, "/*", "*/"));
            for decl in &as_var_decl.declarations {
                if let Some(name) = decl.id.get_identifier_name() {
                    insertions.add_variable(name.to_string());
                }
            }
            insertions.push_pair(Insertion::pair(
                Span::new(
                    decl_span.end,
                    as_var_decl
                        .declarations
                        .iter()
                        .map(|d| d.span().end)
                        .max()
                        .unwrap(),
                ),
                "(",
                ")",
            ));
        }
        return Ok(insertions);
    }
    if let AstKind::ExpressionStatement(as_expr_stmt) = node.kind() {
        if !(get_parent_type(node) == AstType::FunctionBody
            && get_parent_type(get_parent(node).unwrap()) == AstType::ArrowFunctionExpression)
        {
            let expr_span = as_expr_stmt.expression.span();
            // Add semicolons to ensure that expression statements are treated properly.
            // This is a bit of a hack, but it is required to work around the fact that
            // some of our modifications would otherwise end up merging statements; e.g.
            // ```
            // foo = bar
            // qux();
            // ```
            // could become
            // ```
            // (foo = (shouldAwait(bar) ? await bar : bar)
            // (shouldAwait(qux()) ? await qux() : qux())
            // ```
            // which would be a *single* JS statement.
            insertions.push_pair(Insertion::pair(expr_span, ";", ";"));
            if !function_parent.is_some() {
                // If this is a top-level expression statement, it is a candidate for the
                // completion record value.
                insertions.push_pair(Insertion::pair(expr_span, "_cr = (", ")"));
            }
        }
        return Ok(insertions);
    }
    if let AstKind::ReturnStatement(as_ret_stmt) = node.kind() {
        if function_parent.is_some() && !function_parent_is_async {
            if let Some(expr) = &as_ret_stmt.argument {
                // When we return from a function, keep track of the function state
                // and return value.
                insertions.push_pair(Insertion::pair(
                    expr.span(),
                    "(_synchronousReturnValue = (",
                    "), _functionState === 'async' ? _synchronousReturnValue : null);",
                ));
            }
        }
        return Ok(insertions);
    }

    // This is where expression handling starts:
    let parent_node_type = get_parent_type(node);
    let mut wrap_expr_span = None;
    let mut is_named_typeof_rhs = false;
    let mut is_identifier = false;

    if let Some(expr) = get_identifier_reference(node) {
        if parent_node_type == AstType::ObjectProperty {
            // Handles shorthands `{ foo }`, TBD verify correctness
            // (we would still want to potentially await `bar` in `{ foo: bar }`).
            return Ok(insertions);
        }
        is_identifier = true;
        let name = expr.name.as_str();
        let is_eval_this_super_reference = ["eval", "this", "super"].iter().any(|n| *n == name);
        if !is_eval_this_super_reference {
            wrap_expr_span = Some(span); // Wrap identifiers that aren't special identifiers.
        }
    }
    if let AstKind::CallExpression(_) = node.kind() {
        wrap_expr_span = Some(span); // Wrap call expressions.
    }
    if let AstKind::ChainExpression(_) = node.kind() {
        if parent_node_type != AstType::CallExpression {
            wrap_expr_span = Some(span); // Wrap optional chaining expressions that aren't callees.
        }
    }
    if let AstKind::MemberExpression(_) = node.kind() {
        if parent_node_type != AstType::CallExpression {
            wrap_expr_span = Some(span); // Wrap member expressions that aren't callees.
        }
    }

    if let Some(AstKind::UnaryExpression(unary_parent)) = get_parent_kind(node) {
        if is_identifier && unary_parent.operator == UnaryOperator::Typeof {
            is_named_typeof_rhs = true;
        }
        if unary_parent.operator == UnaryOperator::Delete {
            wrap_expr_span = None;
        }
    }
    // In some cases, we know we should not await the expression
    // (e.g. assignment targets, including "weird" assignments like the init part
    // of a for loop statements) or do not need to (e.g. for already
    // `await`-ed expressions).
    if parent_node_type == AstType::ForStatementInit
        || parent_node_type == AstType::AssignmentTarget
        || parent_node_type == AstType::SimpleAssignmentTarget
        || parent_node_type == AstType::AssignmentTargetPattern
        || parent_node_type == AstType::AssignmentTargetWithDefault
        || parent_node_type == AstType::AwaitExpression
        || parent_node_type == AstType::FormalParameter
    {
        wrap_expr_span = None;
    }

    if is_named_typeof_rhs {
        // typeof needs special handling because `typeof foo` does not decompose
        // as `typeof` applied to the value of `foo`, but also checks whether the
        // identifier `foo` exists and in particular does not fail if it does not.
        // So we transform `typeof foo` into
        // `(typeof foo === undefined ? 'undefined' : typeof (shouldAwait(foo) ? await foo : foo))`.
        insertions.push_pair(Insertion::pair(
            get_parent_kind(node).unwrap(),
            format!(
                "(typeof {original} === 'undefined' ? 'undefined' : ",
                original = get_source(node)
            ),
            ")",
        ));
    }
    if let Some(s) = wrap_expr_span {
        // The core magic: Wrap expressions so that if they are special expressions
        // that should be implicitly awaited, we add code that does so.
        insertions.push_pair(Insertion::pair(
            s,
            "(_ex = ",
            ", _isp(_ex) ? await _ex : _ex)",
        ));
    }

    return Ok(insertions);
}

/// Async-rewrite the input JS source code `str` and return the rewritten source code.
#[wasm_bindgen]
pub fn async_rewrite(input: &str, debug_level: DebugLevel) -> Result<String, String> {
    let allocator = Allocator::default();
    let source_type = SourceType::cjs();
    let parsed = Parser::new(&allocator, &input, source_type)
        .with_options(ParseOptions {
            parse_regular_expression: true,
            ..ParseOptions::default()
        })
        .parse();
    if parsed.errors.len() > 0 {
        return Err(format!(
            "Parse errors: {:?}",
            parsed
                .errors
                .iter()
                .map(|e| &e.message)
                .collect::<Vec<&Cow<'static, str>>>()
        ));
    }
    assert!(!parsed.panicked);
    let semantic_ret = SemanticBuilder::new().build(allocator.alloc(parsed.program));

    let mut insertions = InsertionList::new();
    let mut collected_insertions = InsertionList::new();
    for node in semantic_ret.semantic.nodes() {
        collected_insertions.append(&mut collect_insertions(node, &semantic_ret.semantic, debug_level)?);
    }
    {
        let vars = &collected_insertions.vars;
        for var in vars {
            insertions.push_back(Insertion::new(0, format!("var {};", var), false));
        }
    }
    let end = input.len().try_into().unwrap();
    let input_span = Span::new(0, end);
    // Copy all directives, i.e. `'use strict';` and friends.
    for directive in &semantic_ret
        .semantic
        .nodes()
        .root_node()
        .unwrap()
        .kind()
        .as_program()
        .unwrap()
        .directives
    {
        insertions.push_back(Insertion::new(
            0,
            format!("\"{}\";", directive.directive.as_str()),
            false,
        ));
    }
    // Wrap the original source in a function so that we can make
    // shared assumptions, such as the availability of our helpers
    // and of function state tracking.
    insertions.push_pair(Insertion::pair(
        input_span,
        ";(() => { const __SymbolFor = Symbol.for;",
        "})()",
    ));
    insertions.push_pair(make_fn_insertions(input_span));
    // Keep track of the completion record value, and return it from
    // the IIFE so that the script's completion record is what it would
    // originally have been.
    insertions.push_pair(Insertion::pair(
        input_span,
        "var _cr;",
        ";\n return _synchronousReturnValue = _cr;",
    ));
    insertions.append(&mut collected_insertions);

    insertions.sort();

    // Generate the combined string from all insertions.
    let mut previous_offset = 0;
    let mut result =
        String::with_capacity(input.len() + insertions.list.iter().map(|s| s.len()).sum::<usize>());
    let mut debug_tag = "".to_string();
    for insertion in insertions.list {
        if insertion.offset != previous_offset {
            assert!(insertion.offset >= previous_offset);
            result.push_str(&input[previous_offset as usize..insertion.offset as usize]);
            previous_offset = insertion.offset.into();
        }

        let text = insertion.text.as_ref();

        if debug_level >= DebugLevel::Verbose {
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
