use wasm_bindgen::prelude::*;
use rslint_parser::{ast::{ArrowExpr, CallExpr, Expr, ExprOrBlock, FnDecl, FnExpr, ReturnStmt}, parse_text, AstNode, SyntaxNode, TextSize};

#[derive(Debug)]
struct Insertion {
    offset: TextSize,
    text: &'static str,
    original_ordering: Option<u32>
}

impl Insertion {
    pub const fn new(offset: TextSize, text: &'static str) -> Insertion {
        return Insertion {
            offset,
            text,
            original_ordering: None
        }
    }
}

fn is_block(body: &ExprOrBlock) -> bool {
    match body {
        ExprOrBlock::Block(_) => { true }
        ExprOrBlock::Expr(_) => { false }
    }
}

fn fn_start_insertion(body: &ExprOrBlock) -> Vec<Insertion> {
    let mut ret = Vec::new();
    let mut offset = body.syntax().text_range().start();
    if !is_block(body) {
        ret.push(Insertion::new(offset, "{"));
    } else {
        offset = offset.checked_add(1.into()).unwrap();
    }
    ret.push(Insertion::new(offset, r#"
        const _syntheticPromise = Symbol.for('@@mongosh.syntheticPromise');

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
    ));
    if !is_block(body) {
        ret.push(Insertion::new(
            offset,
             "return ("
        ));
    }
    ret
}
fn fn_end_insertion(body: &ExprOrBlock) -> Vec<Insertion> {
    let mut ret = Vec::new();
    let mut offset = body.syntax().text_range().end();
    if is_block(body) {
        offset = offset.checked_sub(1.into()).unwrap();
    } else {
        ret.push(Insertion::new(offset, ");"));
    }
    ret.push(Insertion::new(
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
    ));
    if !is_block(body) {
        ret.push(Insertion::new(offset, "}"));
    }
    ret
}

fn collect_insertions(node: &SyntaxNode, has_function_parent: bool) -> Vec<Insertion> {
    let is_function_node = FnExpr::can_cast(node.kind()) || FnDecl::can_cast(node.kind()) || ArrowExpr::can_cast(node.kind());
    let mut insertions = Vec::new();
    for child in node.children() {
        let range = child.text_range();
        let child_insertions = &mut collect_insertions(&child, has_function_parent || is_function_node);
        if FnDecl::can_cast(child.kind()) {
            let as_fn = FnDecl::cast(child).unwrap();
            if as_fn.async_token().is_none() {
                let body = ExprOrBlock::Block(as_fn.body().unwrap());
                insertions.append(&mut fn_start_insertion(&body));
                insertions.append(child_insertions);
                insertions.append(&mut fn_end_insertion(&body));
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
                if has_function_parent {
                    if is_returned_expression {
                        insertions.push(Insertion::new(range.start(), "(_synchronousReturnValue = "));
                    }
                    insertions.push(Insertion::new(range.start(), "(_ex = "));
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
                            insertions.pop();
                        }
                        insertions.append(child_insertions);
                    }
                    _ => {
                        insertions.append(child_insertions);
                    },
                }
                if has_function_parent {
                    if !is_dot_call_expression {
                        insertions.push(Insertion::new(range.end(), ", _isp(_ex) ? await _ex : _ex)"));
                    }
                    if is_returned_expression {
                        insertions.push(Insertion::new(
                            range.end(),
                            ", _functionState === 'async' ? _synchronousReturnValue : null)"
                        ));
                    }
                }
            }
        }
    }
    return insertions;
}

#[wasm_bindgen]
pub fn async_rewrite(input: String, with_debug_tags: bool) -> String {
    let parsed = parse_text(input.as_str(), 0);
    let mut insertions = collect_insertions(&parsed.syntax(), false);
    let mut i = 0;
    for insertion in &mut insertions {
        i += 1;
        insertion.original_ordering = Some(i);
    }
    insertions.sort_by(|a, b| a.offset.cmp(&b.offset));

    let mut result = input.to_string();
    let mut debug_tag = "".to_string();
    for insertion in insertions.iter().rev() {
        let (before, after) = result.split_at(insertion.offset.into());
        if with_debug_tags {
            debug_tag = [
                "/*i", insertion.original_ordering.unwrap().to_string().as_str(), "@",
                u32::from(insertion.offset).to_string().as_str(), "*/"
            ].concat();
        }
        result = [before, debug_tag.as_str(), insertion.text, debug_tag.as_str(), after].concat();
    }

    result
}
