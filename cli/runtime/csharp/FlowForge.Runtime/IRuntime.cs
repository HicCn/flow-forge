namespace FlowForge.Runtime;

public interface IRuntime
{
    Context Ctx { get; }

    /// <summary>
    /// Transition to the next node.
    /// Calls OnExit on current, then OnEnter on next.
    /// </summary>
    void Transition(INodeHandler next);
}
