namespace FlowForge.Runtime;

public interface INodeHandler
{
    /// <summary>Called when this node becomes active.</summary>
    void OnEnter(IRuntime rt);

    /// <summary>Called every tick while this node is active.</summary>
    NodeStatus OnTick(IRuntime rt, float delta);

    /// <summary>Called when this node deactivates (Complete or interrupted).</summary>
    void OnExit(IRuntime rt);
}
