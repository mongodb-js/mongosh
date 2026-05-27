use core::slice;
use oxc_allocator::Allocator;
use oxc_ast::{
    ast::{
        BindingPattern, ClassType, Expression, FunctionBody, IdentifierReference,
        ParenthesizedExpression, UnaryOperator, VariableDeclarationKind,
    },
    AstKind, AstType,
};
use oxc_diagnostics::OxcDiagnostic;
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

/// Internal markers used in transformations. These are stripped out / processed
/// during the final string-generation phase.
const HOIST_FN_START: &str = "\u{0001}HFS\u{0002}";
const HOIST_FN_END: &str = "\u{0001}HFE\u{0002}";
const HOIST_TARGET: &str = "\u{0001}HT\u{0002}";

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

/// Insertions for the inner async function tracking helpers and try/catch wrapper.
/// This is shared between the outer IIFE and every transformed function.
fn make_fn_insertions(span: impl GetSpan) -> (Insertion, Insertion) {
    Insertion::pair(
        span,
        r#"
    ;const _syntheticPromise = __SymbolFor('@@mongosh.syntheticPromise');
    const _syntheticAsyncIterable = __SymbolFor('@@mongosh.syntheticAsyncIterable');

    function _markSyntheticPromise(p) {
        return Object.defineProperty(p, _syntheticPromise, {
            value: true,
        });
    }

    function _isp(p) {
        return p && p[_syntheticPromise];
    }

    function _ansp(p, s, i) {
        if (p && p[_syntheticPromise]) {
            throw new MongoshAsyncWriterError(
                'Result of expression "' + s + '" cannot be used in this context',
                'SyntheticPromiseInAlwaysSyncContext');
        }
        if (i && p && p[_syntheticAsyncIterable]) {
            throw new MongoshAsyncWriterError(
                'Result of expression "' + s + '" cannot be iterated in this context',
                'SyntheticAsyncIterableInAlwaysSyncContext');
        }
        return p;
    }

    function _aaitsi(original) {
        if (!original || !original[_syntheticAsyncIterable]) {
            return { iterable: original, isSyntheticAsyncIterable: false };
        }
        const originalIterator = original[Symbol.asyncIterator]();
        let next;
        let returned;
        return {
            isSyntheticAsyncIterable: true,
            iterable: {
                [Symbol.iterator]() { return this; },
                next() {
                    let _next = next;
                    next = undefined;
                    return _next;
                },
                return(value) {
                    returned = { value };
                    return { value, done: true };
                },
                async expectNext() {
                    next ??= await originalIterator.next();
                },
                async syncReturn() {
                    if (returned) {
                        await originalIterator.return(returned.value);
                    }
                }
            }
        };
    }

    function _de(err) {
        if (Object.prototype.toString.call(err) === '[object Error]' &&
            typeof err.message === 'string' &&
            err.message.includes('\ufeff')) {
            err.message = err.message.replace(/\(\s*"\ufeff(.+?)\ufeff"\s*,(?:[^\(]|\([^)]*\))*\)/g, function(m, o) { return o; });
        }
        return err;
    }

    let _functionState = 'sync', _synchronousReturnValue, _ex;

    const _asynchronousReturnValue = (async () => {
    try {"#,
        r#"
    } catch (err) {
        err = _de(err);
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

/// Insertions for sync-only contexts (class constructors, non-async generators).
/// Just adds an _ansp helper and re-throws errors to allow demangling.
fn make_sync_only_fn_insertions(span: impl GetSpan) -> (Insertion, Insertion) {
    Insertion::pair(
        span,
        r#"
    ;const _syntheticPromise = __SymbolFor('@@mongosh.syntheticPromise');
    const _syntheticAsyncIterable = __SymbolFor('@@mongosh.syntheticAsyncIterable');
    function _ansp(p, s, i) {
        if (p && p[_syntheticPromise]) {
            throw new MongoshAsyncWriterError(
                'Result of expression "' + s + '" cannot be used in this context',
                'SyntheticPromiseInAlwaysSyncContext');
        }
        if (i && p && p[_syntheticAsyncIterable]) {
            throw new MongoshAsyncWriterError(
                'Result of expression "' + s + '" cannot be iterated in this context',
                'SyntheticAsyncIterableInAlwaysSyncContext');
        }
        return p;
    }
    function _de(err) {
        if (Object.prototype.toString.call(err) === '[object Error]' &&
            typeof err.message === 'string' &&
            err.message.includes('\ufeff')) {
            err.message = err.message.replace(/\(\s*"\ufeff(.+?)\ufeff"\s*,(?:[^\(]|\([^)]*\))*\)/g, function(m, o) { return o; });
        }
        return err;
    }
    try {
    "#,
        r#"
    } catch (err) {
        throw _de(err);
    }
    "#,
    )
}

/// Insertions for an async (but not sync-rewriter-wrapped) function body.
/// Provides the helpers and runs the body inside try/catch for error demangling.
fn make_async_fn_insertions(span: impl GetSpan) -> (Insertion, Insertion) {
    Insertion::pair(
        span,
        r#"
    ;const _syntheticPromise = __SymbolFor('@@mongosh.syntheticPromise');
    const _syntheticAsyncIterable = __SymbolFor('@@mongosh.syntheticAsyncIterable');
    function _isp(p) {
        return p && p[_syntheticPromise];
    }
    function _aaitsi(original) {
        if (!original || !original[_syntheticAsyncIterable]) {
            return { iterable: original, isSyntheticAsyncIterable: false };
        }
        const originalIterator = original[Symbol.asyncIterator]();
        let next;
        let returned;
        return {
            isSyntheticAsyncIterable: true,
            iterable: {
                [Symbol.iterator]() { return this; },
                next() {
                    let _next = next;
                    next = undefined;
                    return _next;
                },
                return(value) {
                    returned = { value };
                    return { value, done: true };
                },
                async expectNext() {
                    next ??= await originalIterator.next();
                },
                async syncReturn() {
                    if (returned) {
                        await originalIterator.return(returned.value);
                    }
                }
            }
        };
    }
    function _de(err) {
        if (Object.prototype.toString.call(err) === '[object Error]' &&
            typeof err.message === 'string' &&
            err.message.includes('\ufeff')) {
            err.message = err.message.replace(/\(\s*"\ufeff(.+?)\ufeff"\s*,(?:[^\(]|\([^)]*\))*\)/g, function(m, o) { return o; });
        }
        return err;
    }
    let _ex;
    try {
    "#,
        r#"
    } catch (err) {
        throw _de(err);
    }
    "#,
    )
}

fn add_fn_insertions(
    insertions: &mut InsertionList,
    body: &FunctionBody,
    has_block_body: bool,
    kind: FnTransformKind,
    marker: String,
) {
    let span = body.span();
    // Ensure that the function body is a block statement. Is a no-op for non-arrow
    // functions, but changes behavior of expression-returning arrow functions.
    insertions.push_pair(Insertion::pair(span, "{", "}"));
    // Insert the original-source marker AFTER `{` and BEFORE the inner wrapper.
    // Using non-reverse insertion at body.span.start so it goes before everything else
    // pushed later at the same offset.
    insertions.push_back(Insertion::new(span.start, marker, false));
    match kind {
        FnTransformKind::AsyncWrap => insertions.push_pair(make_fn_insertions(span)),
        FnTransformKind::AlreadyAsync => insertions.push_pair(make_async_fn_insertions(span)),
        FnTransformKind::SyncOnly => insertions.push_pair(make_sync_only_fn_insertions(span)),
    }
    if !has_block_body {
        // This is an expression-returning arrow function without a body,
        // so we need to add an explicit `return` statement.
        match kind {
            FnTransformKind::AsyncWrap => {
                insertions.push_pair(Insertion::pair(
                    span,
                    "return (_synchronousReturnValue = (",
                    "), _functionState === 'async' ? _synchronousReturnValue : null);",
                ));
            }
            _ => {
                insertions.push_pair(Insertion::pair(span, "return (", ");"));
            }
        }
    }
}

#[derive(Debug, Clone, Copy)]
enum FnTransformKind {
    /// Non-async function -> wrap in async IIFE with sync/async tracking
    AsyncWrap,
    /// Already-async function -> just demangle errors
    AlreadyAsync,
    /// Sync-only context (constructor, non-async generator) -> never await, throw on synthetic promise/iterable
    SyncOnly,
}

/// Utility for `get_identifier_reference`. Given a parenthesized expression,
/// return the identifier reference it wraps, if it does.
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

/// Walks up the ancestors to find the nearest function-like context, and returns
/// what transformation kind that function uses. Class constructors and non-async
/// generator functions both count as "sync-only" contexts that can't await.
fn enclosing_function_kind<'a>(
    node: &AstNode<'a>,
    semantic: &'a Semantic<'a>,
) -> Option<FnTransformKind> {
    let ast_nodes = semantic.nodes();
    for ancestor in ast_nodes.ancestor_kinds(node.id()).skip(1) {
        match ancestor {
            AstKind::Function(f) => {
                let mut is_constructor = false;
                let func_node_id = f.node_id.get();
                let parent_of_fn = ast_nodes.parent_node(func_node_id);
                if let AstKind::MethodDefinition(md) = parent_of_fn.kind() {
                    if matches!(md.kind, oxc_ast::ast::MethodDefinitionKind::Constructor) {
                        is_constructor = true;
                    }
                }
                let kind = if f.r#async {
                    FnTransformKind::AlreadyAsync
                } else if f.generator || is_constructor {
                    FnTransformKind::SyncOnly
                } else {
                    FnTransformKind::AsyncWrap
                };
                return Some(kind);
            }
            AstKind::ArrowFunctionExpression(f) => {
                let kind = if f.r#async {
                    FnTransformKind::AlreadyAsync
                } else {
                    FnTransformKind::AsyncWrap
                };
                return Some(kind);
            }
            AstKind::StaticBlock(_) => {
                return Some(FnTransformKind::AsyncWrap);
            }
            _ => {}
        }
    }
    None
}

fn limit_string_length(input: &str, max_length: usize) -> String {
    let chars: Vec<char> = input.chars().collect();
    if chars.len() <= max_length {
        return input.to_string();
    }
    let prefix_len = ((max_length - 5) as f64 * 0.7).floor() as usize;
    let suffix_len = max_length - 5 - prefix_len;
    let prefix: String = chars[..prefix_len].iter().collect();
    let suffix: String = chars[chars.len() - suffix_len..].iter().collect();
    format!("{} ... {}", prefix, suffix)
}

fn extract_binding_names_impl(pattern: &BindingPattern, out: &mut Vec<String>) {
    match pattern {
        BindingPattern::BindingIdentifier(id) => {
            out.push(id.name.to_string());
        }
        BindingPattern::ObjectPattern(obj) => {
            for prop in &obj.properties {
                extract_binding_names_impl(&prop.value, out);
            }
            if let Some(rest) = obj.rest.as_ref() {
                extract_binding_names_impl(&rest.argument, out);
            }
        }
        BindingPattern::ArrayPattern(arr) => {
            for elem in &arr.elements {
                if let Some(elem) = elem {
                    extract_binding_names_impl(elem, out);
                }
            }
            if let Some(rest) = arr.rest.as_ref() {
                extract_binding_names_impl(&rest.argument, out);
            }
        }
        BindingPattern::AssignmentPattern(p) => {
            extract_binding_names_impl(&p.left, out);
        }
    }
}

fn extract_binding_names(pattern: &BindingPattern) -> Vec<String> {
    let mut out = Vec::new();
    extract_binding_names_impl(pattern, &mut out);
    out
}

/// Check if a node sits in an "assignment target" position where the expression
/// cannot be wrapped.
fn is_in_assignment_target_position<'a>(node: &AstNode<'a>, semantic: &'a Semantic<'a>) -> bool {
    let ast_nodes = semantic.nodes();
    let parent = ast_nodes.parent_node(node.id());
    let parent_type = parent.kind().ty();

    if matches!(
        parent_type,
        AstType::ArrayAssignmentTarget
            | AstType::ObjectAssignmentTarget
            | AstType::AssignmentTargetWithDefault
            | AstType::AssignmentTargetPropertyIdentifier
            | AstType::AssignmentTargetPropertyProperty
            | AstType::AssignmentTargetRest
            | AstType::FormalParameter
            | AstType::FormalParameters
    ) {
        return true;
    }
    if let AstKind::AssignmentExpression(assign) = parent.kind() {
        if node.span() == assign.left.span() {
            return true;
        }
    }
    if let AstKind::UpdateExpression(upd) = parent.kind() {
        if node.span() == upd.argument.span() {
            return true;
        }
    }
    // For loops: init can be an Expression that is also an assignment target etc.
    if let AstKind::ForStatement(fs) = parent.kind() {
        if let Some(init) = &fs.init {
            if init.span() == node.span() {
                return true;
            }
        }
    }
    if let AstKind::ForInStatement(fs) = parent.kind() {
        if fs.left.span() == node.span() {
            return true;
        }
    }
    if let AstKind::ForOfStatement(fs) = parent.kind() {
        if fs.left.span() == node.span() {
            return true;
        }
    }
    false
}

/// Build a JS-string-literal-safe representation of the original source for
/// passing to `<async_rewriter>` marker.
fn percent_encode_for_marker(s: &str) -> String {
    let mut result = String::with_capacity(s.len() * 3);
    for byte in s.bytes() {
        match byte {
            // RFC 3986 unreserved characters
            b'A'..=b'Z'
            | b'a'..=b'z'
            | b'0'..=b'9'
            | b'-'
            | b'_'
            | b'.'
            | b'~'
            | b'!'
            | b'*'
            | b'\''
            | b'('
            | b')' => {
                result.push(byte as char);
            }
            _ => {
                result.push_str(&format!("%{:02X}", byte));
            }
        }
    }
    result
}

/// Encode a string for use as a JS string literal source-text (for the demangler).
/// Uses the U+FEFF byte order mark as a marker so error messages can be rewritten.
fn js_string_literal_for_demangling(s: &str) -> String {
    let limited = limit_string_length(s, 25);
    let mut result = String::with_capacity(limited.len() + 4);
    result.push('"');
    result.push('\u{FEFF}');
    for c in limited.chars() {
        match c {
            '"' => result.push_str("\\\""),
            '\\' => result.push_str("\\\\"),
            '\n' => result.push_str("\\n"),
            '\r' => result.push_str("\\r"),
            '\t' => result.push_str("\\t"),
            '\u{08}' => result.push_str("\\b"),
            '\u{0C}' => result.push_str("\\f"),
            '\0'..='\u{1F}' | '\u{7F}'..='\u{9F}' => {
                result.push_str(&format!("\\u{:04x}", c as u32));
            }
            _ => result.push(c),
        }
    }
    result.push('\u{FEFF}');
    result.push('"');
    result
}

/// Plain JS string literal of `s`.
fn plain_js_string_literal(s: &str) -> String {
    let mut result = String::with_capacity(s.len() + 2);
    result.push('"');
    for c in s.chars() {
        match c {
            '"' => result.push_str("\\\""),
            '\\' => result.push_str("\\\\"),
            '\n' => result.push_str("\\n"),
            '\r' => result.push_str("\\r"),
            '\t' => result.push_str("\\t"),
            '\u{08}' => result.push_str("\\b"),
            '\u{0C}' => result.push_str("\\f"),
            '\0'..='\u{1F}' | '\u{7F}'..='\u{9F}' => {
                result.push_str(&format!("\\u{:04x}", c as u32));
            }
            _ => result.push(c),
        }
    }
    result.push('"');
    result
}

/// Collect all insertions for a given node.
fn collect_insertions(
    node: &AstNode,
    semantic: &Semantic,
    source: &str,
    debug_level: DebugLevel,
) -> Result<InsertionList, &'static str> {
    let ast_nodes = &semantic.nodes();

    // Determine the enclosing function and what transformation kind it had.
    let function_parent_kind = enclosing_function_kind(node, semantic);

    // Helpers to get the parent node and its kind (~ full node information)/type.
    let get_parent = |node: &AstNode| ast_nodes.parent_node(node.id());
    let get_parent_kind = |node: &AstNode| get_parent(node).kind();
    let get_parent_type = |node: &AstNode| get_parent_kind(node).ty();

    // Helpers to get the source text of a given node.
    let get_source = |node: &dyn GetSpan| {
        let Span { start, end, .. } = node.span();
        return source[(start as usize)..(end as usize)].to_string();
    };

    let span = node.span();

    let mut insertions = InsertionList::new();

    if debug_level >= DebugLevel::TypesOnly {
        // Debugging utility -- insert the type of the node into the generated source.
        let ty = node.kind().ty();
        insertions.push_back(Insertion::new(span.start, format!(" /*{ty:#?}*/ "), false));
    }

    // === Handle function declarations / expressions ===
    if let AstKind::Function(as_fn) = node.kind() {
        let body = as_fn.body.as_ref().ok_or("bad FnDecl without body")?;

        // Determine if this is a function declaration vs expression.
        // Hoisting transformation only applies to declarations at the program scope or
        // inside blocks that are not nested in functions.
        let parent_kind = get_parent_kind(node);
        let is_decl = matches!(parent_kind, AstKind::Program(_))
            || matches!(parent_kind, AstKind::BlockStatement(_))
            || matches!(parent_kind, AstKind::IfStatement(_))
            || matches!(parent_kind, AstKind::LabeledStatement(_))
            || matches!(parent_kind, AstKind::ExportDefaultDeclaration(_))
            || matches!(parent_kind, AstKind::ExportNamedDeclaration(_));

        // Detect if this Function is a class method (key, value), in which case
        // it is not a declaration in our sense.
        let is_class_method = matches!(parent_kind, AstKind::MethodDefinition(_));
        // Detect if this is an ObjectProperty method (not a declaration).
        let is_object_method = matches!(parent_kind, AstKind::ObjectProperty(_));

        let is_declaration =
            is_decl && !is_class_method && !is_object_method && function_parent_kind.is_none();

        // Determine the FnTransformKind for this function itself.
        let mut is_constructor = false;
        if is_class_method {
            if let AstKind::MethodDefinition(md) = parent_kind {
                if matches!(md.kind, oxc_ast::ast::MethodDefinitionKind::Constructor) {
                    is_constructor = true;
                }
            }
        }
        let kind = if as_fn.r#async {
            FnTransformKind::AlreadyAsync
        } else if as_fn.generator || is_constructor {
            FnTransformKind::SyncOnly
        } else {
            FnTransformKind::AsyncWrap
        };

        if is_declaration {
            match &as_fn.id {
                None => {
                    insertions.push_back(Insertion::new(span.start, "/*no ident token*/", false));
                }
                Some(name) => {
                    // For top-level decl, rename function and add assignment.
                    // For block-scoped, hoist the entire source.
                    let is_program_level = matches!(parent_kind, AstKind::Program(_));
                    if is_program_level {
                        insertions.push_pair(Insertion::pair(
                            Span::new(name.span().end, span.end),
                            "__",
                            format!(";\n_cr = {name} = {name}__;\n", name = name.name.as_str()),
                        ));
                        insertions.add_variable(name.to_string());
                    } else {
                        // Block-scoped function: emit marker around the declaration and
                        // the assignment, so that both move to the top of the IIFE.
                        insertions.push_back(Insertion::new(span.start, HOIST_FN_START, false));
                        // Push HOIST_FN_END BEFORE the rename pair so its reverse-ordering
                        // sort places it AFTER the rename close (in output position),
                        // ensuring the rename close (`;_cr = f = f__;`) is captured inside
                        // the hoist region.
                        insertions.push_back(Insertion::new(span.end, HOIST_FN_END, true));
                        insertions.push_pair(Insertion::pair(
                            Span::new(name.span().end, span.end),
                            "__",
                            format!(";\n_cr = {name} = {name}__;\n", name = name.name.as_str()),
                        ));
                        // Leave behind an expression statement evaluating the function
                        // name, so that block-level function declarations contribute
                        // their value to the completion record (matching babel behavior).
                        insertions.push_back(Insertion::new(
                            span.end,
                            format!(";_cr = {name};", name = name.name.as_str()),
                            false,
                        ));
                        insertions.add_variable(name.to_string());
                    }
                }
            }
        }

        // Add original-source marker for Function.prototype.toString support.
        // For class methods, use the MethodDefinition's span so the method name is included.
        // For object methods, use the ObjectProperty's span similarly.
        let marker_span = if is_class_method || is_object_method {
            get_parent(node).span()
        } else {
            span
        };
        let original = source[(marker_span.start as usize)..(marker_span.end as usize)].to_string();
        let marker = format!(
            "\"<async_rewriter>{}</>\";",
            percent_encode_for_marker(&original)
        );
        // Apply async wrapping or other inner-function transformations.
        add_fn_insertions(&mut insertions, body, true, kind, marker);
        return Ok(insertions);
    }
    if let AstKind::ArrowFunctionExpression(as_fn) = node.kind() {
        let body = &as_fn.body;
        let kind = if as_fn.r#async {
            FnTransformKind::AlreadyAsync
        } else {
            FnTransformKind::AsyncWrap
        };
        // Add original-source marker for Function.prototype.toString support.
        let original = get_source(&span);
        let marker = format!(
            "\"<async_rewriter>{}</>\";",
            percent_encode_for_marker(&original)
        );
        add_fn_insertions(&mut insertions, body, !as_fn.expression, kind, marker);
        return Ok(insertions);
    }
    if let AstKind::Class(as_class) = node.kind() {
        // Only hoist program-level class declarations.
        let parent_kind = get_parent_kind(node);
        let is_class_declaration = !matches!(as_class.r#type, ClassType::ClassExpression);
        let is_program_level = matches!(parent_kind, AstKind::Program(_));
        if is_class_declaration && is_program_level {
            if let Some(name) = as_class.name() {
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
        // Only do this for `var` (any scope, hoisted) or any kind at the Program level.
        let parent_type = get_parent_type(node);
        let is_var = matches!(as_var_decl.kind, VariableDeclarationKind::Var);
        let parent_is_program = matches!(get_parent_kind(node), AstKind::Program(_));
        // Don't hoist if it's the init of a for-statement (e.g. `for (let i = 0; ...)`).
        let is_for_init = matches!(
            parent_type,
            AstType::ForStatement | AstType::ForInStatement | AstType::ForOfStatement
        );

        let should_hoist =
            !is_for_init && function_parent_kind.is_none() && (parent_is_program || is_var);

        if should_hoist {
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
                for name in extract_binding_names(&decl.id) {
                    insertions.add_variable(name);
                }
            }
            // Wrap the declarator(s) in parens to make them an expression.
            // For no-init case (e.g. `let x;`), the trailing `x` is just an identifier
            // expression statement and doesn't need any further wrapping. For init
            // cases, the parens ensure that `let {a} = b;` becomes `({a} = b);`.
            let max_end = as_var_decl
                .declarations
                .iter()
                .map(|d| d.span().end)
                .max()
                .unwrap();
            let any_destructuring = as_var_decl
                .declarations
                .iter()
                .any(|d| !matches!(d.id, BindingPattern::BindingIdentifier(_)));
            if any_destructuring {
                insertions.push_pair(Insertion::pair(Span::new(decl_span.end, max_end), "(", ")"));
            }
        }
        return Ok(insertions);
    }
    if let AstKind::ExpressionStatement(as_expr_stmt) = node.kind() {
        // We add semicolons to ensure that expression statements are treated properly.
        let parent_kind = get_parent_kind(node);
        let parent_is_arrow_body = matches!(parent_kind, AstKind::FunctionBody(_))
            && matches!(
                get_parent_kind(get_parent(node)),
                AstKind::ArrowFunctionExpression(_)
            );
        // For single-statement control-flow bodies, we wrap with `{...}` instead of
        // adding loose semicolons, because something like `if (x) foo(); else bar();`
        // can't be rewritten to `if (x) foo();; else bar();` (the extra `;` breaks the
        // `else` matching).
        let parent_is_control_flow_body = matches!(
            parent_kind,
            AstKind::IfStatement(_)
                | AstKind::WhileStatement(_)
                | AstKind::DoWhileStatement(_)
                | AstKind::ForStatement(_)
                | AstKind::ForInStatement(_)
                | AstKind::ForOfStatement(_)
                | AstKind::WithStatement(_)
                | AstKind::LabeledStatement(_)
        );
        if !parent_is_arrow_body {
            let expr_span = as_expr_stmt.expression.span();
            if parent_is_control_flow_body {
                // Wrap the whole statement in a block (so we can safely add semicolons).
                insertions.push_back(Insertion::new(node.span().start, "{", false));
                insertions.push_back(Insertion::new(node.span().end, "}", true));
            }
            insertions.push_pair(Insertion::pair(expr_span, ";", ";"));
            if function_parent_kind.is_none() {
                // If this is a top-level expression statement, it is a candidate for the
                // completion record value.
                insertions.push_pair(Insertion::pair(expr_span, "_cr = (", ")"));
            }
        }
        return Ok(insertions);
    }
    if let AstKind::ReturnStatement(as_ret_stmt) = node.kind() {
        if matches!(function_parent_kind, Some(FnTransformKind::AsyncWrap)) {
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

    // === Handle TryStatement for uncatchable exceptions ===
    if let AstKind::TryStatement(try_stmt) = node.kind() {
        // We transform the try/catch/finally so that exceptions marked with
        // Symbol.for('@@mongosh.uncatchable') are not caught.
        let has_finally = try_stmt.finalizer.is_some();
        let block_span = try_stmt.block.span();
        let try_keyword_end = block_span.start; // approx — we'll insert before the block

        let handler = try_stmt.handler.as_ref();
        let _ = try_keyword_end;
        // Plan:
        // - If there's no catch, synthesize a catch (err) { throw err; } around the body
        //   so we can insert the uncatchable-check.
        // - If there's a catch with no param, generate a param.
        // - If there's a catch with a destructuring pattern, generate a variable to hold the
        //   raw exception and then destructure it.
        // - With finally, also track an _isCatchable variable.

        // Generate a unique-ish suffix based on span to avoid collisions between nested try/catch.
        let unique = format!("__{}", span.start);
        let isc = format!("_isCatchable{}", unique);

        // Generate the new structure by emitting before/after segments around the original
        // block, handler, and finalizer.

        if !has_finally {
            // Simple case: try { block } catch (orig_param) { /* check uncatchable */ original-body }
            // Without finally we don't need to track _isCatchable.

            if let Some(handler) = handler {
                // If handler has no param, or has a destructuring param, normalize.
                let err_name = format!("_err{}", unique);
                let (catch_open, after_open_brace) = match &handler.param {
                    None => {
                        // No param. We can't add a param to existing catch without complex transform.
                        // Insert err_name as param.
                        // We need to inject `err_name` between `catch` and `{`.
                        // The handler span is `catch ... { body }`. We replace `catch` keyword head.
                        // We'll insert before handler.body.span().start.
                        // Find the offset of `{` in the handler.
                        // The handler.span starts at `catch`. handler.body.span.start is `{`.
                        // We insert `(err_name)` before the body.
                        // But that's not valid syntax for a catch — need `catch (err) {}`.
                        // Insert before handler.body.span.start: `(_errN) `
                        let body_start = handler.body.span().start;
                        insertions.push_back(Insertion::new(
                            body_start,
                            format!(" (_err{}) ", unique),
                            false,
                        ));
                        // After the `{` of body, insert the uncatchable check open.
                        let inner = body_start + 1;
                        insertions.push_back(Insertion::new(
                            inner,
                            format!(
                                "if (!{e} || !{e}[__SymbolFor('@@mongosh.uncatchable')]) {{ ",
                                e = err_name
                            ),
                            false,
                        ));
                        // Before `}` of body, close the if and add else throw.
                        let body_end = handler.body.span().end;
                        insertions.push_back(Insertion::new(
                            body_end - 1,
                            format!(" }} else throw _err{};", unique),
                            true,
                        ));
                        (String::new(), String::new())
                    }
                    Some(param) => {
                        match &param.pattern {
                            BindingPattern::BindingIdentifier(id) => {
                                // Classic catch(err) { ... }: just inject uncatchable check around body.
                                let body_start = handler.body.span().start;
                                let body_end = handler.body.span().end;
                                let err_id = id.name.as_str();
                                insertions.push_back(Insertion::new(
                                    body_start + 1,
                                    format!(
                                        "if (!{e} || !{e}[__SymbolFor('@@mongosh.uncatchable')]) {{ ",
                                        e = err_id
                                    ),
                                    false,
                                ));
                                insertions.push_back(Insertion::new(
                                    body_end - 1,
                                    format!(" }} else throw {};", err_id),
                                    true,
                                ));
                                (String::new(), String::new())
                            }
                            _ => {
                                // Destructuring catch — wrap pattern.
                                // catch ({a, b}) { body } -> catch (_errN) { if (!check) { let {a,b} = _errN; body } else throw _errN }
                                let pattern_span = param.pattern.span();
                                let pattern_source = &source
                                    [(pattern_span.start as usize)..(pattern_span.end as usize)];
                                // Replace the pattern with err_name.
                                insertions.push_back(Insertion::new(
                                    pattern_span.start,
                                    format!("_err{}", unique),
                                    false,
                                ));
                                insertions.push_back(Insertion::new(
                                    pattern_span.end,
                                    "".to_string(),
                                    true,
                                ));
                                // Comment out the original pattern source:
                                insertions.push_back(Insertion::new(
                                    pattern_span.start,
                                    "/*",
                                    false,
                                ));
                                insertions.push_back(Insertion::new(pattern_span.end, "*/", true));
                                let body_start = handler.body.span().start;
                                let body_end = handler.body.span().end;
                                insertions.push_back(Insertion::new(
                                    body_start + 1,
                                    format!(
                                        "if (!_err{u} || !_err{u}[__SymbolFor('@@mongosh.uncatchable')]) {{ let {pat} = _err{u}; ",
                                        u = unique,
                                        pat = pattern_source
                                    ),
                                    false,
                                ));
                                insertions.push_back(Insertion::new(
                                    body_end - 1,
                                    format!(" }} else throw _err{};", unique),
                                    true,
                                ));
                                (String::new(), String::new())
                            }
                        }
                    }
                };
                let _ = (catch_open, after_open_brace);
            } else {
                // try { block } without catch and without finally would not be syntactically valid,
                // but JS does allow `try { ... } finally { ... }`. If we reach here, both handler
                // and finalizer are None, which is invalid; just skip.
            }
        } else {
            // With finalizer.
            // Strategy: wrap the entire try statement with a let _isCatchable = true; block,
            // and inject _isCatchable tracking into the catch handler.

            // Insert before the try statement: `let _isCatchable_N = true; `
            insertions.push_back(Insertion::new(
                span.start,
                format!("let {} = true;", isc),
                false,
            ));

            if let Some(handler) = handler {
                let inner_err = format!("_innerErr{}", unique);
                match &handler.param {
                    None => {
                        let body_start = handler.body.span().start;
                        let body_end = handler.body.span().end;
                        insertions.push_back(Insertion::new(
                            body_start,
                            format!(" (_err{}) ", unique),
                            false,
                        ));
                        insertions.push_back(Insertion::new(
                            body_start + 1,
                            format!(
                                "{isc} = (!_err{u} || !_err{u}[__SymbolFor('@@mongosh.uncatchable')]); if ({isc}) {{ try {{ ",
                                isc = isc, u = unique
                            ),
                            false,
                        ));
                        insertions.push_back(Insertion::new(
                            body_end - 1,
                            format!(
                                " }} catch ({ie}) {{ {isc} = (!{ie} || !{ie}[__SymbolFor('@@mongosh.uncatchable')]); throw {ie}; }} }} else throw _err{u};",
                                ie = inner_err,
                                isc = isc,
                                u = unique
                            ),
                            true,
                        ));
                    }
                    Some(param) => {
                        if let BindingPattern::BindingIdentifier(id) = &param.pattern {
                            let err_id = id.name.as_str();
                            let body_start = handler.body.span().start;
                            let body_end = handler.body.span().end;
                            insertions.push_back(Insertion::new(
                                body_start + 1,
                                format!(
                                    "{isc} = (!{e} || !{e}[__SymbolFor('@@mongosh.uncatchable')]); if ({isc}) {{ try {{ ",
                                    isc = isc,
                                    e = err_id
                                ),
                                false,
                            ));
                            insertions.push_back(Insertion::new(
                                body_end - 1,
                                format!(
                                    " }} catch ({ie}) {{ {isc} = (!{ie} || !{ie}[__SymbolFor('@@mongosh.uncatchable')]); throw {ie}; }} }} else throw {e};",
                                    ie = inner_err,
                                    isc = isc,
                                    e = err_id
                                ),
                                true,
                            ));
                        } else {
                            // Destructuring with finally: rewrite param.
                            let pattern_span = param.pattern.span();
                            let pattern_source =
                                &source[(pattern_span.start as usize)..(pattern_span.end as usize)];
                            insertions.push_back(Insertion::new(
                                pattern_span.start,
                                format!("_err{}/*", unique),
                                false,
                            ));
                            insertions.push_back(Insertion::new(pattern_span.end, "*/", true));
                            let body_start = handler.body.span().start;
                            let body_end = handler.body.span().end;
                            insertions.push_back(Insertion::new(
                                body_start + 1,
                                format!(
                                    "{isc} = (!_err{u} || !_err{u}[__SymbolFor('@@mongosh.uncatchable')]); if ({isc}) {{ let {pat} = _err{u}; try {{ ",
                                    isc = isc,
                                    u = unique,
                                    pat = pattern_source
                                ),
                                false,
                            ));
                            insertions.push_back(Insertion::new(
                                body_end - 1,
                                format!(
                                    " }} catch ({ie}) {{ {isc} = (!{ie} || !{ie}[__SymbolFor('@@mongosh.uncatchable')]); throw {ie}; }} }} else throw _err{u};",
                                    ie = inner_err,
                                    isc = isc,
                                    u = unique
                                ),
                                true,
                            ));
                        }
                    }
                }
            } else {
                // No handler but has finalizer. Synthesize one.
                // We need to insert ` catch (_errN) { _isCatchable_N = (!_errN || !_errN[...]); throw _errN; } `
                // between the block and the finally.
                let block_end = block_span.end;
                insertions.push_back(Insertion::new(
                    block_end,
                    format!(
                        " catch (_err{u}) {{ {isc} = (!_err{u} || !_err{u}[__SymbolFor('@@mongosh.uncatchable')]); throw _err{u}; }} ",
                        u = unique,
                        isc = isc
                    ),
                    false,
                ));
            }

            // Wrap finally body with `if (_isCatchable) { ... }`.
            if let Some(finalizer) = try_stmt.finalizer.as_ref() {
                let fb_start = finalizer.span().start;
                let fb_end = finalizer.span().end;
                insertions.push_back(Insertion::new(
                    fb_start + 1,
                    format!("if ({}) {{ ", isc),
                    false,
                ));
                insertions.push_back(Insertion::new(fb_end - 1, " }", true));
            }
        }
        return Ok(insertions);
    }

    // === Handle CatchClause for error demangling ===
    if let AstKind::CatchClause(catch_clause) = node.kind() {
        // We add a `param = _de(param)` at the top of the catch body when the catch has a simple identifier param.
        if let Some(param) = &catch_clause.param {
            if let BindingPattern::BindingIdentifier(id) = &param.pattern {
                let body_start = catch_clause.body.span().start;
                // Inject after the uncatchable check open. We use body_start + 1 (after `{`).
                // We add a high "ordering" by emitting after — relying on insertion order.
                insertions.push_back(Insertion::new(
                    body_start + 1,
                    format!(" {n} = _de({n});", n = id.name.as_str()),
                    false,
                ));
            }
        }
        return Ok(insertions);
    }

    // === Handle ForOfStatement for implicit async iteration in async functions ===
    if let AstKind::ForOfStatement(for_of) = node.kind() {
        if !for_of.r#await {
            // Sync-only contexts get _ansp wrapping via regular expression handling.
            // All other contexts (top-level IIFE, async function, AsyncWrap) get
            // the for-of expansion.
            let is_sync_only = matches!(function_parent_kind, Some(FnTransformKind::SyncOnly));
            if !is_sync_only {
                // We emit markers around the for-of pieces (LEFT, RIGHT, BODY) so a
                // post-processing step can extract the AST-transformed text for each
                // and rebuild the for-of into a structure where the helper setup
                // happens BEFORE the for-of. That way, the for-of's right operand is
                // a simple `(SRC_MARKER, _it)` comma expression and V8's "X is not
                // iterable" error message will show the source code (which our error
                // demangler then converts back to the original).
                let unique = span.start.to_string();
                let right_span = for_of.right.span();
                let right_source = &source[(right_span.start as usize)..(right_span.end as usize)];
                let right_source_marker = js_string_literal_for_demangling(right_source);
                let body_span = for_of.body.span();
                let left_span = for_of.left.span();

                // Push markers FIRST so they wrap the AST-transformed content for each part.
                // The id is encoded in the markers and a fixed-length "marker" string
                // makes them easy to find in the post-processing step.
                insertions.push_back(Insertion::new(
                    span.start,
                    format!("\u{1}FOFS{}\u{2}", unique),
                    false,
                ));
                insertions.push_back(Insertion::new(
                    span.end,
                    format!("\u{1}FOFE{}\u{2}", unique),
                    true,
                ));
                insertions.push_back(Insertion::new(
                    left_span.start,
                    format!("\u{1}FOLS{}\u{2}", unique),
                    false,
                ));
                insertions.push_back(Insertion::new(
                    left_span.end,
                    format!("\u{1}FOLE{}\u{2}", unique),
                    true,
                ));
                insertions.push_back(Insertion::new(
                    right_span.start,
                    format!("\u{1}FORS{}\u{2}", unique),
                    false,
                ));
                insertions.push_back(Insertion::new(
                    right_span.end,
                    format!("\u{1}FORE{}\u{2}", unique),
                    true,
                ));
                insertions.push_back(Insertion::new(
                    body_span.start,
                    format!("\u{1}FOBS{}\u{2}", unique),
                    false,
                ));
                insertions.push_back(Insertion::new(
                    body_span.end,
                    format!("\u{1}FOBE{}\u{2}", unique),
                    true,
                ));
                // Also encode the source marker as a marker that the post-processor can pick up.
                insertions.push_back(Insertion::new(
                    span.start,
                    format!(
                        "\u{1}FOSM{u}={src}\u{2}",
                        u = unique,
                        src = right_source_marker
                    ),
                    false,
                ));
                // Note: actual restructuring happens in post-processing.
                let _ = right_source;
            }
        }
        return Ok(insertions);
    }

    // === Handle Statement-level: nothing special for most ===

    // === Expression handling ===
    let parent_node_type = get_parent_type(node);
    let mut wrap_expr_span = None;
    let mut is_named_typeof_rhs = false;
    let mut is_identifier = false;
    let mut is_member = false;

    if let Some(expr) = get_identifier_reference(node) {
        // Shorthands `{ foo }` in object expressions: skip; but the ObjectProperty
        // node is the parent, and we want to skip when this is the key of a shorthand.
        if let AstKind::ObjectProperty(prop) = get_parent_kind(node) {
            if prop.shorthand {
                return Ok(insertions);
            }
        }
        // Shorthand property of object pattern (destructuring): skip.
        if matches!(
            parent_node_type,
            AstType::BindingProperty | AstType::AssignmentTargetPropertyIdentifier
        ) {
            return Ok(insertions);
        }
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
        if parent_node_type != AstType::CallExpression {
            wrap_expr_span = Some(span);
        }
    }
    if matches!(
        node.kind(),
        AstKind::ComputedMemberExpression(_)
            | AstKind::StaticMemberExpression(_)
            | AstKind::PrivateFieldExpression(_)
    ) {
        is_member = true;
        if parent_node_type != AstType::CallExpression {
            wrap_expr_span = Some(span);
        }
    }
    if let AstKind::TaggedTemplateExpression(_) = node.kind() {
        wrap_expr_span = Some(span);
    }

    // Detect typeof on identifiers.
    if let AstKind::UnaryExpression(unary_parent) = get_parent_kind(node) {
        if is_identifier && unary_parent.operator == UnaryOperator::Typeof {
            is_named_typeof_rhs = true;
        }
        if unary_parent.operator == UnaryOperator::Delete {
            wrap_expr_span = None;
        }
    }

    // Skip if we're in a no-wrap position.
    if is_in_assignment_target_position(node, semantic)
        || parent_node_type == AstType::AwaitExpression
        || parent_node_type == AstType::YieldExpression
    {
        // Yield: we don't wrap directly, but the special case for `yield* iter` is below.
        if parent_node_type != AstType::YieldExpression {
            wrap_expr_span = None;
        } else {
            // Yield expression: only wrap if it's the argument (and only if it's not a yield*).
            // Actually we still want to wrap normal yield args for await purposes — wait, we're
            // inside an async function or sync-only context. For sync-only (generator), we want
            // to call _ansp with `i=true` if it's a yield*.
            // For our current logic just leave the wrap as it is.
        }
    }
    // typeof: wrap_expr_span may be still Some (we handled it).

    // Special handling for callee in CallExpression: don't wrap if it's a MemberExpression
    // (we'd lose `this`), Import, or eval.
    if parent_node_type == AstType::CallExpression {
        if let AstKind::CallExpression(call) = get_parent_kind(node) {
            if call.callee.span() == node.span() {
                // We're the callee.
                if is_member {
                    // Member expression callee - keep as is, just wrap arguments separately.
                    wrap_expr_span = None;
                }
                if let AstKind::IdentifierReference(id) = node.kind() {
                    if id.name.as_str() == "eval" {
                        wrap_expr_span = None;
                    }
                }
                if matches!(node.kind(), AstKind::ImportExpression(_)) {
                    wrap_expr_span = None;
                }
            }
        }
    }

    // Don't wrap if there's no enclosing function (we're at the top level outside the IIFE).
    // Actually since everything ends up in the IIFE, we should wrap at the top level too.
    // The check was previously based on `function_parent.is_some()` but that's misleading.
    // We always wrap inside our IIFE wrapper.

    // For sync-only contexts: use _ansp instead of `_isp(_ex) ? await _ex : _ex`.
    let is_sync_only = matches!(function_parent_kind, Some(FnTransformKind::SyncOnly));

    if is_named_typeof_rhs {
        // typeof needs special handling because `typeof foo` does not decompose
        // as `typeof` applied to the value of `foo`, but also checks whether the
        // identifier `foo` exists and in particular does not fail if it does not.
        // So we transform `typeof foo` into
        // `(typeof foo === 'undefined' ? 'undefined' : typeof (shouldAwait(foo) ? await foo : foo))`.
        insertions.push_pair(Insertion::pair(
            get_parent_kind(node),
            format!(
                "(typeof {original} === 'undefined' ? 'undefined' : ",
                original = get_source(node)
            ),
            ")",
        ));
    }
    if let Some(s) = wrap_expr_span {
        // The core magic: wrap expressions so that if they are special expressions
        // that should be implicitly awaited, we add code that does so.
        if is_sync_only {
            // In a sync-only context, throw an error if the value is a synthetic promise.
            let original = get_source(node);
            // Determine if this is a yield* delegate iterable.
            let is_yield_delegate = if let AstKind::YieldExpression(y) = get_parent_kind(node) {
                y.delegate
            } else {
                false
            };
            // Also check ForOf right (iterating value)
            let is_for_of_right = if let AstKind::ForOfStatement(fs) = get_parent_kind(node) {
                fs.right.span() == node.span()
            } else {
                false
            };
            let i_arg = if is_yield_delegate || is_for_of_right {
                "true"
            } else {
                "false"
            };
            // For _ansp, use a plain string literal (no \ufeff markers) so the error
            // message doesn't contain stray markers.
            let plain_lit = plain_js_string_literal(&limit_string_length(&original, 25));
            insertions.push_pair(Insertion::pair(
                s,
                format!("_ansp("),
                format!(", {}, {})", plain_lit, i_arg),
            ));
        } else {
            // Use the await pattern with original source marker for error demangling.
            let original = get_source(node);
            let src_lit = js_string_literal_for_demangling(&original);
            insertions.push_pair(Insertion::pair(
                s,
                format!("({}, _ex = ", src_lit),
                ", _isp(_ex) ? await _ex : _ex)",
            ));
        }
    }

    return Ok(insertions);
}

fn fail_if_nonempty_oxc_diagnostics(diagnostics: &[OxcDiagnostic]) -> Result<(), String> {
    if diagnostics.len() == 0 {
        Ok(())
    } else {
        Err(format!(
            "SyntaxError: {:?}",
            diagnostics
                .iter()
                .map(|e| &e.message)
                .collect::<Vec<&Cow<'static, str>>>()
        ))
    }
}

/// Async-rewrite the input JS source code `str` and return the rewritten source code.
#[wasm_bindgen]
pub fn async_rewrite(input: &str, debug_level: DebugLevel) -> Result<String, String> {
    let allocator = Allocator::default();
    let source_type = SourceType::cjs();
    let parsed = Parser::new(&allocator, &input, source_type)
        .with_options(ParseOptions {
            parse_regular_expression: true,
            allow_return_outside_function: false,
            ..ParseOptions::default()
        })
        .parse();
    fail_if_nonempty_oxc_diagnostics(&parsed.errors)?;
    assert!(!parsed.panicked);

    let semantic_ret = SemanticBuilder::new()
        .with_check_syntax_error(true)
        .build(allocator.alloc(parsed.program));
    fail_if_nonempty_oxc_diagnostics(&semantic_ret.errors)?;

    // Detect duplicate top-level let/const/class declarations.
    // JavaScript normally throws "X has already been declared" for these at parse time,
    // but our transformation hoists them into `var` declarations which would otherwise
    // silently accept redeclarations.
    {
        let program_node = semantic_ret.semantic.nodes().program();
        let mut seen_names: std::collections::HashSet<String> = std::collections::HashSet::new();
        let mut duplicate: Option<String> = None;
        'outer: for stmt in &program_node.body {
            use oxc_ast::ast::Statement;
            match stmt {
                Statement::VariableDeclaration(vd)
                    if matches!(
                        vd.kind,
                        VariableDeclarationKind::Let | VariableDeclarationKind::Const
                    ) =>
                {
                    for decl in &vd.declarations {
                        let mut names = Vec::new();
                        extract_binding_names_impl(&decl.id, &mut names);
                        for name in names {
                            if !seen_names.insert(name.clone()) {
                                duplicate = Some(name);
                                break 'outer;
                            }
                        }
                    }
                }
                Statement::ClassDeclaration(c) => {
                    if let Some(name) = c.name() {
                        let n = name.as_str().to_string();
                        if !seen_names.insert(n.clone()) {
                            duplicate = Some(n);
                            break 'outer;
                        }
                    }
                }
                _ => {}
            }
        }
        if let Some(name) = duplicate {
            return Err(format!(
                "SyntaxError: Identifier '{}' has already been declared",
                name
            ));
        }
    }

    let mut insertions = InsertionList::new();
    let mut collected_insertions = InsertionList::new();
    for node in semantic_ret.semantic.nodes() {
        collected_insertions.append(&mut collect_insertions(
            node,
            &semantic_ret.semantic,
            input,
            debug_level,
        )?);
    }
    // Deduplicate variables (in case multiple declarations reference the same name).
    collected_insertions.vars.sort();
    collected_insertions.vars.dedup();
    {
        let vars = &collected_insertions.vars;
        for var in vars {
            insertions.push_back(Insertion::new(0, format!("var {};", var), false));
        }
    }
    let end = input.len().try_into().unwrap();
    let input_span = Span::new(0, end);
    // Copy all directives, i.e. `'use strict';` and friends, to the outermost scope.
    for directive in &semantic_ret.semantic.nodes().program().directives {
        insertions.push_back(Insertion::new(
            0,
            format!("\"{}\";", directive.directive.as_str()),
            false,
        ));
    }
    // Special case: if the program is just a single directive (e.g. just `"use strict"`),
    // treat it as a string literal expression.
    let program_node = semantic_ret.semantic.nodes().program();
    let only_directive = program_node.body.is_empty() && program_node.directives.len() == 1;

    // Wrap the original source in a function so that we can make shared assumptions.
    insertions.push_pair(Insertion::pair(
        input_span,
        ";(() => { const __SymbolFor = Symbol.for; var MongoshAsyncWriterError; if (typeof globalThis.MongoshAsyncWriterError === 'undefined') { MongoshAsyncWriterError = class extends Error { constructor(message, codeIdentifier) { const codes = {SyntheticPromiseInAlwaysSyncContext:'ASYNC-10012',SyntheticAsyncIterableInAlwaysSyncContext:'ASYNC-10013'}; const code = codes[codeIdentifier]; super('[' + code + '] ' + message); this.code = code; } }; } else { MongoshAsyncWriterError = globalThis.MongoshAsyncWriterError; }",
        "})()",
    ));
    insertions.push_pair(make_fn_insertions(input_span));
    // Keep track of the completion record value, and return it from the IIFE.
    insertions.push_pair(Insertion::pair(
        input_span,
        format!("var _cr; {}", HOIST_TARGET),
        ";\n return (_synchronousReturnValue = _cr, _functionState === 'async' ? _synchronousReturnValue : null);",
    ));
    if only_directive {
        // Emit the directive as a string expression instead.
        let directive = &program_node.directives[0];
        let value = directive.expression.value.as_str();
        let lit = plain_js_string_literal(value);
        insertions.push_back(Insertion::new(
            input_span.start,
            format!("_cr = ({});", lit),
            false,
        ));
    }
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

    // Post-process: move hoisted function declarations to the HOIST_TARGET position.
    let result = post_process_hoists(result);
    // Post-process: restructure for-of statements.
    let result = post_process_for_of(result);

    Ok(result)
}

/// Restructure for-of statements that were marked with `\u{1}FOFS...FOFE\u{2}`
/// markers. The post-process extracts the LEFT/RIGHT/BODY parts (with their
/// AST-transformed text) and rebuilds the for-of into a structure where the
/// helper setup happens BEFORE the for-of (so V8's "X is not iterable" error
/// includes the source representation, which our demangler can then
/// transform back to the original).
fn post_process_for_of(input: String) -> String {
    // Find all marker positions. We do a single pass.
    // For each for-of (identified by unique id), find:
    //  - FOFS<id> ... FOFE<id> bounds
    //  - FOLS<id> ... FOLE<id> (LEFT content)
    //  - FORS<id> ... FORE<id> (RIGHT content)
    //  - FOBS<id> ... FOBE<id> (BODY content)
    //  - FOSM<id>=... (source marker for RIGHT)
    if !input.contains("\u{1}FOFS") {
        return input;
    }

    // Iteratively process the innermost for-of first (to handle nesting).
    let mut current = input;
    loop {
        let Some(start_marker_pos) = find_innermost_fofs(&current) else {
            break;
        };
        // Extract the id from the marker.
        let (id, after_fofs) = extract_marker_id(&current, start_marker_pos, "FOFS");
        let Some(id) = id else {
            // Malformed - just remove the marker and continue.
            current = current.replacen(&format!("\u{1}FOFS{}\u{2}", "x"), "", 1);
            continue;
        };

        // Find the matching FOFE marker.
        let end_marker_text = format!("\u{1}FOFE{}\u{2}", id);
        let Some(end_marker_pos) = current[after_fofs..].find(&end_marker_text) else {
            // No matching end - remove this start and continue.
            current.replace_range(start_marker_pos..after_fofs, "");
            continue;
        };
        let end_marker_pos = after_fofs + end_marker_pos;
        let end_marker_end = end_marker_pos + end_marker_text.len();

        // Extract source marker (FOSM<id>=<lit>).
        let sm_prefix = format!("\u{1}FOSM{}=", id);
        let src_marker = extract_marker_with_value(&current, &sm_prefix);

        // Extract LEFT, RIGHT, BODY content.
        let left = extract_between(
            &current,
            &format!("\u{1}FOLS{}\u{2}", id),
            &format!("\u{1}FOLE{}\u{2}", id),
        );
        let right = extract_between(
            &current,
            &format!("\u{1}FORS{}\u{2}", id),
            &format!("\u{1}FORE{}\u{2}", id),
        );
        let body = extract_between(
            &current,
            &format!("\u{1}FOBS{}\u{2}", id),
            &format!("\u{1}FOBE{}\u{2}", id),
        );

        let (left, right, body) = match (left, right, body) {
            (Some(l), Some(r), Some(b)) => (l, r, b),
            _ => {
                // Couldn't extract; remove the FOFS marker and skip to avoid infinite loop.
                current.replace_range(start_marker_pos..after_fofs, "");
                continue;
            }
        };
        let src_marker = src_marker.unwrap_or_else(|| "\"<unknown>\"".to_string());

        // Build the new for-of structure.
        let u = &id;
        let replacement = format!(
            "{{ let _ii{u}, _isai{u}, _it{u}; \
             _ii{u} = _aaitsi({right}); \
             _isai{u} = _ii{u}.isSyntheticAsyncIterable; \
             _it{u} = _ii{u}.iterable; \
             if (_isai{u}) await _it{u}.expectNext(); \
             try {{ \
               for ({left} of ({src}, _it{u})) {{ \
                 try {{ {body} }} finally {{ _isai{u} && await _it{u}.expectNext(); }} \
               }} \
             }} finally {{ _isai{u} && await _it{u}.syncReturn(); }} \
             }}",
            u = u,
            right = right.trim(),
            left = left.trim(),
            body = body.trim(),
            src = src_marker.trim(),
        );

        // Replace the range from start_marker_pos to end_marker_end with the new structure.
        current.replace_range(start_marker_pos..end_marker_end, &replacement);
    }

    // Clean up any leftover markers that didn't get processed (shouldn't happen but just in case).
    strip_all_for_of_markers(current)
}

fn strip_all_for_of_markers(s: String) -> String {
    // Strip any \u{1}FO*\u{2} markers that remain.
    let mut result = String::with_capacity(s.len());
    let mut i = 0;
    let bytes = s.as_bytes();
    while i < bytes.len() {
        if bytes[i] == 0x01 {
            // Find matching 0x02.
            if let Some(end_rel) = s[i + 1..].find('\u{2}') {
                // Check that the marker starts with "FO" or "HFS"/"HFE" (we don't strip those).
                let marker_body = &s[i + 1..i + 1 + end_rel];
                if marker_body.starts_with("FO") {
                    i = i + 1 + end_rel + 1;
                    continue;
                }
            }
        }
        let ch_end = next_char_boundary(&s, i);
        result.push_str(&s[i..ch_end]);
        i = ch_end;
    }
    result
}

/// Find the position of an innermost FOFS marker (one that doesn't enclose another).
fn find_innermost_fofs(input: &str) -> Option<usize> {
    // Innermost = the one with no FOFS between it and its matching FOFE.
    // Easier: find a FOFS where the next FO marker we see after it is FOFE (not another FOFS).
    // Simpler still: find the LAST FOFS that comes before any FOFE.
    // Or: find a FOFS<id> such that there's no other FOFS between it and FOFE<id>.
    // For simplicity, scan and find a FOFS that has its FOFE BEFORE any other FOFS.
    let mut search_start = 0;
    while let Some(rel) = input[search_start..].find("\u{1}FOFS") {
        let pos = search_start + rel;
        // Get the id.
        let after = pos + "\u{1}FOFS".len();
        let id_end = input[after..].find('\u{2}')?;
        let id = &input[after..after + id_end];
        let fofe = format!("\u{1}FOFE{}\u{2}", id);
        let after_id = after + id_end + 1;
        // Find next FOFS or this FOFE in the remaining text.
        let next_fofs = input[after_id..].find("\u{1}FOFS").map(|x| after_id + x);
        let this_fofe = input[after_id..].find(&fofe).map(|x| after_id + x);
        match (next_fofs, this_fofe) {
            (None, Some(_)) => return Some(pos),
            (Some(nf), Some(tf)) if tf < nf => return Some(pos),
            _ => {
                // There's a nested for-of before this one's end; check next.
                search_start = after_id;
            }
        }
    }
    None
}

/// Extract the id following a marker prefix. Returns (id, position_after_marker_end).
fn extract_marker_id(input: &str, pos: usize, prefix: &str) -> (Option<String>, usize) {
    let marker_start = format!("\u{1}{}", prefix);
    if !input[pos..].starts_with(&marker_start) {
        return (None, pos);
    }
    let after = pos + marker_start.len();
    let Some(end_rel) = input[after..].find('\u{2}') else {
        return (None, pos);
    };
    let id = input[after..after + end_rel].to_string();
    (Some(id), after + end_rel + 1)
}

/// Extract the text between an open marker and a close marker. Removes the markers
/// from the input (modifies in place via String replace).
fn extract_between(input: &str, open: &str, close: &str) -> Option<String> {
    let open_pos = input.find(open)?;
    let after_open = open_pos + open.len();
    let close_pos_rel = input[after_open..].find(close)?;
    let close_pos = after_open + close_pos_rel;
    Some(input[after_open..close_pos].to_string())
}

/// Extract a marker that has the form `\u{1}FOSM<id>=<value>\u{2}`. Returns the value.
fn extract_marker_with_value(input: &str, prefix: &str) -> Option<String> {
    let pos = input.find(prefix)?;
    let after = pos + prefix.len();
    let end_rel = input[after..].find('\u{2}')?;
    Some(input[after..after + end_rel].to_string())
}

/// Find HOIST_FN_START..HOIST_FN_END spans and move them to the HOIST_TARGET position.
fn post_process_hoists(input: String) -> String {
    let target_idx = match input.find(HOIST_TARGET) {
        Some(i) => i,
        None => return input.replace(HOIST_FN_START, "").replace(HOIST_FN_END, ""),
    };

    let mut hoisted = String::new();
    let mut remaining = String::with_capacity(input.len());
    let mut i = 0;
    let bytes = input.as_bytes();
    while i < bytes.len() {
        // Check for HOIST_FN_START.
        if input[i..].starts_with(HOIST_FN_START) {
            let after_start = i + HOIST_FN_START.len();
            if let Some(end_rel) = input[after_start..].find(HOIST_FN_END) {
                let end_idx = after_start + end_rel;
                hoisted.push_str(&input[after_start..end_idx]);
                hoisted.push('\n');
                i = end_idx + HOIST_FN_END.len();
                continue;
            }
        }
        // Copy single byte.
        let ch_end = next_char_boundary(&input, i);
        remaining.push_str(&input[i..ch_end]);
        i = ch_end;
    }

    // Now insert hoisted at HOIST_TARGET position in `remaining`.
    let target_idx_in_remaining = remaining.find(HOIST_TARGET).unwrap_or(target_idx);
    let mut final_result = String::with_capacity(remaining.len() + hoisted.len());
    final_result.push_str(&remaining[..target_idx_in_remaining]);
    final_result.push_str(&hoisted);
    final_result.push_str(&remaining[target_idx_in_remaining + HOIST_TARGET.len()..]);
    final_result
}

fn next_char_boundary(s: &str, mut i: usize) -> usize {
    i += 1;
    while !s.is_char_boundary(i) && i < s.len() {
        i += 1;
    }
    i
}

#[no_mangle]
pub extern "C" fn async_rewrite_c(
    input: *const u8,
    input_len: usize,
    output: *mut *mut i8,
    output_len: *mut usize,
    debug_level: u8,
) -> u8 {
    let input = unsafe { String::from_utf8_lossy(slice::from_raw_parts(input, input_len)) };

    let result = async_rewrite(
        input.as_ref(),
        match debug_level {
            0 => DebugLevel::None,
            1 => DebugLevel::TypesOnly,
            2 => DebugLevel::Verbose,
            _ => return 1,
        },
    );
    match result {
        Ok(output_str) => {
            let output_cstr = std::ffi::CString::new(output_str).unwrap();
            unsafe {
                *output_len = output_cstr.as_bytes().len();
                *output = output_cstr.into_raw();
            }
            0
        }
        Err(_) => 1,
    }
}

#[no_mangle]
pub extern "C" fn async_rewrite_free_result(result: *mut i8) -> () {
    if !result.is_null() {
        unsafe {
            drop(std::ffi::CString::from_raw(result));
        }
    }
}
