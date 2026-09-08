#![allow(clippy::panic, clippy::unwrap_used)]
//! Proc macros for declarative Rust ↔ Python FFI bindings.
//!
//! # `#[derive(PythonImports)]`
//!
//! Generates a `from_python(py: Python<'_>) -> PyResult<Self>` constructor
//! that imports a single Python module and resolves each field via `getattr`.
//!
//! ## Struct attribute
//!
//! `#[py(module = "dotted.python.module")]` — the module to `py.import()`.
//!
//! ## Field attribute
//!
//! `#[py(attr = "PYTHON_NAME")]` — the attribute name to `getattr` on the module.
//!
//! ## Type-driven resolution
//!
//! | Field type      | Generated code                                         |
//! |-----------------|--------------------------------------------------------|
//! | `Py<PyAny>`     | `module.getattr("NAME")?.unbind()`                     |
//! | `Py<T>`         | `module.getattr("NAME")?.cast::<T>()?.clone().unbind()`|
//! | other (e.g f64) | `module.getattr("NAME")?.extract()?`                   |

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, Data, DeriveInput, Fields, GenericArgument, PathArguments, Type};

#[proc_macro_derive(PythonImports, attributes(py))]
pub fn derive_python_imports(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let name = &input.ident;

    let module_path = extract_module_attr(&input.attrs)
        .unwrap_or_else(|| panic!("#[py(module = \"...\")] is required on struct {name}"));

    let fields = match &input.data {
        Data::Struct(ds) => match &ds.fields {
            Fields::Named(f) => &f.named,
            _ => panic!("PythonImports only supports structs with named fields"),
        },
        _ => panic!("PythonImports can only be derived for structs"),
    };

    let field_inits: Vec<_> = fields
        .iter()
        .map(|f| {
            let field_name = f.ident.as_ref().unwrap_or_else(|| panic!("unnamed field"));
            let attr_name = extract_field_attr(&f.attrs).unwrap_or_else(|| {
                panic!("#[py(attr = \"...\")] is required on field `{field_name}`")
            });

            let strategy = classify_type(&f.ty);
            match strategy {
                FieldStrategy::PyAny => quote! {
                    #field_name: manifest.getattr(#attr_name)?.unbind()
                },
                FieldStrategy::PyCast(inner) => quote! {
                    #field_name: manifest.getattr(#attr_name)?.cast::<#inner>()?.clone().unbind()
                },
                FieldStrategy::Extract => quote! {
                    #field_name: manifest.getattr(#attr_name)?.extract()?
                },
            }
        })
        .collect();

    let expanded = quote! {
        impl #name {
            pub(crate) fn from_python(py: ::pyo3::Python<'_>) -> ::pyo3::PyResult<Self> {
                let manifest = py.import(#module_path)?;
                Ok(Self {
                    #(#field_inits),*
                })
            }
        }
    };

    expanded.into()
}

enum FieldStrategy {
    PyAny,
    PyCast(Box<syn::Type>),
    Extract,
}

/// Inspect the field type and decide the resolution strategy.
fn classify_type(ty: &Type) -> FieldStrategy {
    if let Type::Path(tp) = ty {
        let last_seg = tp.path.segments.last();
        if let Some(seg) = last_seg {
            if seg.ident == "Py" {
                if let PathArguments::AngleBracketed(ref args) = seg.arguments {
                    if let Some(GenericArgument::Type(inner_ty)) = args.args.first() {
                        if is_py_any(inner_ty) {
                            return FieldStrategy::PyAny;
                        }
                        return FieldStrategy::PyCast(Box::new(inner_ty.clone()));
                    }
                }
            }
        }
    }
    FieldStrategy::Extract
}

fn is_py_any(ty: &Type) -> bool {
    if let Type::Path(tp) = ty {
        if let Some(seg) = tp.path.segments.last() {
            return seg.ident == "PyAny";
        }
    }
    false
}

/// Extract `#[py(module = "...")]` from struct-level attributes.
fn extract_module_attr(attrs: &[syn::Attribute]) -> Option<String> {
    for attr in attrs {
        if !attr.path().is_ident("py") {
            continue;
        }
        if let Ok(list) = attr.meta.require_list() {
            let tokens = list.tokens.to_string();
            if let Some(val) = parse_kv(&tokens, "module") {
                return Some(val);
            }
        }
    }
    None
}

/// Extract `#[py(attr = "...")]` from field-level attributes.
fn extract_field_attr(attrs: &[syn::Attribute]) -> Option<String> {
    for attr in attrs {
        if !attr.path().is_ident("py") {
            continue;
        }
        if let Ok(list) = attr.meta.require_list() {
            let tokens = list.tokens.to_string();
            if let Some(val) = parse_kv(&tokens, "attr") {
                return Some(val);
            }
        }
    }
    None
}

/// Parse `key = "value"` from a token string like `attr = "_USER_STORE"`.
fn parse_kv(tokens: &str, key: &str) -> Option<String> {
    let prefix = format!("{key} = ");
    if let Some(rest) = tokens.strip_prefix(&prefix) {
        let trimmed = rest.trim().trim_matches('"');
        return Some(trimmed.to_string());
    }
    for part in tokens.split(',') {
        let part = part.trim();
        if let Some(rest) = part.strip_prefix(&prefix) {
            let trimmed = rest.trim().trim_matches('"');
            return Some(trimmed.to_string());
        }
    }
    None
}
