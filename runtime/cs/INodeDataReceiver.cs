using System.Text.Json;

namespace FlowForge.Runtime;

/// <summary>
/// Implemented by nodes that receive editor-serialized JSON data.
/// </summary>
public interface INodeDataReceiver
{
    /// <summary>Receive the node's editor data as a JSON element.</summary>
    void ReceiveNodeData(JsonElement nodeJson);
}
