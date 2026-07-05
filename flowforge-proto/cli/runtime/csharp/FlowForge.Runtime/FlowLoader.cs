using System.Text.Json;

namespace FlowForge.Runtime;

public static class FlowLoader
{
    /// <summary>
    /// Load a .flow JSON document and construct the runtime.
    /// Returns (executor, nodeMap, context) — call executor.Start() to begin.
    /// </summary>
    public static (Executor Executor, Dictionary<string, INodeHandler> NodeMap, Context Ctx)
        Load(string json, IHostInterface host, IReadOnlyDictionary<string, Type> customHandlerTypes)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        // ── 1. Context & variables ──
        var ctx = new Context(host);
        if (root.TryGetProperty("parameters", out var paramsEl))
        {
            foreach (var p in paramsEl.EnumerateArray())
            {
                var key = p.GetProperty("key").GetString()!;
                var val = ParseJsonValue(p.GetProperty("default"));
                ctx.Variables[key] = val;
            }
        }

        // ── 2. Node map ──
        var nodeMap = new Dictionary<string, INodeHandler>();
        string? startNodeId = null;

        if (root.TryGetProperty("nodes", out var nodesEl))
        {
            foreach (var n in nodesEl.EnumerateArray())
            {
                var id = n.GetProperty("id").GetString()!;
                var type = n.GetProperty("type").GetString()!;

                if (type == "flow_start")
                    startNodeId = id;

                var handler = CreateHandler(type, n, customHandlerTypes);
                nodeMap[id] = handler;
            }
        }

        if (startNodeId == null || !nodeMap.TryGetValue(startNodeId, out var rootNode))
            throw new InvalidOperationException("flow_start node not found");

        // ── 3. Wire outs ──
        if (root.TryGetProperty("edges", out var edgesEl))
        {
            foreach (var e in edgesEl.EnumerateArray())
            {
                var srcId = e.GetProperty("source_node").GetString()!;
                var srcPin = e.GetProperty("source_pin").GetString()!;
                var tgtId = e.GetProperty("target_node").GetString()!;
                var tgtPin = e.GetProperty("target_pin").GetString()!;

                if (nodeMap.TryGetValue(srcId, out var srcNode) && nodeMap.TryGetValue(tgtId, out var tgtNode))
                {
                    (srcNode as IWireOuts)?.SetOut(srcPin, tgtNode);
                }
            }
        }

        // ── 4. Wire all outs (for composite nodes with custom wiring) ──
        var executor = new Executor(ctx, rootNode, nodeMap, startNodeId);
        executor.WireOuts();

        return (executor, nodeMap, ctx);
    }

    private static INodeHandler CreateHandler(string type, JsonElement nodeJson,
        IReadOnlyDictionary<string, Type> customHandlerTypes)
    {
        if (customHandlerTypes.TryGetValue(type, out var handlerType))
        {
            var handler = (INodeHandler)Activator.CreateInstance(handlerType)!;
            // Set node data if handler supports it
            (handler as INodeDataReceiver)?.ReceiveNodeData(nodeJson);
            return handler;
        }

        throw new InvalidOperationException($"No handler registered for node type: {type}");
    }

    private static object? ParseJsonValue(JsonElement el)
    {
        return el.ValueKind switch
        {
            JsonValueKind.String => el.GetString(),
            JsonValueKind.Number => el.TryGetInt64(out var i) ? i : el.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            _ => el.GetRawText()
        };
    }
}

/// <summary>Generated handlers implement this to receive their node data during construction</summary>
public interface INodeDataReceiver
{
    void ReceiveNodeData(JsonElement nodeJson);
}
