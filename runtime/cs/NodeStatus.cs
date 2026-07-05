namespace FlowForge.Runtime;

/// <summary>
/// Execution status returned by <see cref="INodeHandler.OnTick"/>.
/// </summary>
public enum NodeStatus
{
    /// <summary>Node is still executing; will be ticked again next frame.</summary>
    Running,

    /// <summary>Node has finished; runtime advances to the next node.</summary>
    Complete,
}
