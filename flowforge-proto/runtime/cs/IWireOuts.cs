using System.Collections.Generic;

namespace FlowForge.Runtime;

/// <summary>
/// Implemented by nodes that wire output pins to downstream handlers.
/// </summary>
public interface IWireOuts
{
    /// <summary>Wire an output pin to a target handler.</summary>
    void SetOut(string pinId, INodeHandler target);

    /// <summary>Resolve pin references after all nodes are loaded.</summary>
    void ResolveOuts(IReadOnlyDictionary<string, INodeHandler> nodeMap);
}
