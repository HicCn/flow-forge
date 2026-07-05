pub mod parser;
pub mod generator_cs;

use std::fs;
use std::path::Path;

const RUNTIME_CS_FILES: &[(&str, &str)] = &[
    ("INodeHandler.cs", include_str!("../../../runtime/cs/INodeHandler.cs")),
    ("IWireOuts.cs", include_str!("../../../runtime/cs/IWireOuts.cs")),
    ("INodeDataReceiver.cs", include_str!("../../../runtime/cs/INodeDataReceiver.cs")),
    ("NodeStatus.cs", include_str!("../../../runtime/cs/NodeStatus.cs")),
    ("IRuntime.cs", include_str!("../../../runtime/cs/IRuntime.cs")),
    ("Param.cs", include_str!("../../../runtime/cs/Param.cs")),
];

#[derive(Debug, serde::Serialize)]
pub struct GenerateResult {
    pub generated: Vec<String>,
    pub runtime_files: Vec<String>,
    pub skipped_runtime: Vec<String>,
}

/// Generate C# runtime code from node definitions JSON.
/// Writes generated `.gen.cs` files and copies Runtime base files to `output_dir`.
pub fn generate_runtime_cs(
    node_defs_json: &str,
    output_dir: &str,
    force_runtime: bool,
) -> Result<GenerateResult, String> {
    let defs = parser::parse_node_defs(node_defs_json)?;

    let out = Path::new(output_dir);
    let gen_dir = out.join("Generated");
    let runtime_dir = out.join("Runtime");

    fs::create_dir_all(&gen_dir).map_err(|e| format!("Failed to create Generated/: {}", e))?;
    fs::create_dir_all(&runtime_dir).map_err(|e| format!("Failed to create Runtime/: {}", e))?;

    let mut generated = Vec::new();
    for def in &defs {
        let file_name = format!("{}Node.gen.cs", generator_cs::to_pascal_case(&def.node_type));
        let code = generator_cs::generate(def);
        let file_path = gen_dir.join(&file_name);
        fs::write(&file_path, &code)
            .map_err(|e| format!("Failed to write {}: {}", file_name, e))?;
        generated.push(file_name);
    }

    // Copy Runtime base files (skip existing unless force_runtime)
    let mut runtime_files = Vec::new();
    let mut skipped_runtime = Vec::new();
    for (name, content) in RUNTIME_CS_FILES {
        let dest = runtime_dir.join(name);
        if dest.exists() && !force_runtime {
            skipped_runtime.push(name.to_string());
            continue;
        }
        fs::write(&dest, *content)
            .map_err(|e| format!("Failed to write {}: {}", name, e))?;
        runtime_files.push(name.to_string());
    }

    Ok(GenerateResult {
        generated,
        runtime_files,
        skipped_runtime,
    })
}

// Re-export helper for use by other modules
#[allow(unused_imports)]
pub use generator_cs::to_pascal_case;
