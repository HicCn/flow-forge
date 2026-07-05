//! Parses FlowForge node definitions (NodeDefinition[]) from JSON.
//! The input format matches the frontend's `NodeDefinition` TypeScript type.

use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NodeDefinition {
    #[serde(rename = "type")]
    pub node_type: String,
    pub category: String,
    pub label: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub color: String,
    #[serde(default)]
    pub icon: String,
    pub pins: Pins,
    #[serde(default)]
    pub params: Vec<ParamDef>,
    #[serde(default)]
    pub writes: Vec<WriteDef>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Pins {
    #[serde(default)]
    pub inputs: Vec<PinDef>,
    #[serde(default)]
    pub outputs: Vec<PinDef>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PinDef {
    pub id: String,
    #[serde(default)]
    pub label: String,
    #[serde(rename = "type")]
    pub pin_type: String,
    #[serde(default)]
    pub required: bool,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ParamDef {
    pub key: String,
    #[serde(rename = "type")]
    pub param_type: String,
    pub label: String,
    #[serde(default)]
    pub default: Option<serde_json::Value>,
    #[serde(default)]
    pub required: bool,
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub options: Vec<String>,
    #[serde(default)]
    pub min: Option<f64>,
    #[serde(default)]
    pub max: Option<f64>,
    #[serde(default)]
    pub placeholder: String,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WriteDef {
    pub key: String,
    #[serde(rename = "type")]
    pub write_type: String,
    #[serde(default)]
    pub description: String,
}

/// Parse a JSON string of `NodeDefinition[]`.
pub fn parse_node_defs(json: &str) -> Result<Vec<NodeDefinition>, String> {
    serde_json::from_str(json).map_err(|e| format!("Failed to parse node definitions: {}", e))
}
