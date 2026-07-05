namespace FlowForge.Runtime;

/// <summary>
/// A node that can be executed by the FlowForge runtime.
/// Implement (or extend the generated partial class) to add behaviour.
/// </summary>
public interface INodeHandler
{
    /// <summary>Called once when the node becomes active.</summary>
    void OnEnter(IRuntime rt);

    /// <summary>Called every frame while the node is active.</summary>
    /// <returns><see cref="NodeStatus.Running"/> to keep ticking;
    /// <see cref="NodeStatus.Complete"/> to advance.</returns>
    NodeStatus OnTick(IRuntime rt, float delta);

    /// <summary>Called once when the node completes or is interrupted.</summary>
    void OnExit(IRuntime rt);
}
