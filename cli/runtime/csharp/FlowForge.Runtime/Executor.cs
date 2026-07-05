namespace FlowForge.Runtime;

public class Executor : IRuntime
{
    private INodeHandler _active;
    private readonly Dictionary<string, INodeHandler> _nodeMap;
    private readonly string _startNodeId;

    public Context Ctx { get; }

    public Executor(Context ctx, INodeHandler root, Dictionary<string, INodeHandler> nodeMap, string startNodeId)
    {
        Ctx = ctx;
        _active = root;
        _nodeMap = nodeMap;
        _startNodeId = startNodeId;
    }

    /// <summary>Call from game loop (e.g. Godot _Process)</summary>
    public NodeStatus Tick(float delta)
    {
        return _active.OnTick(this, delta);
    }

    void IRuntime.Transition(INodeHandler next)
    {
        _active.OnExit(this);
        _active = next;
        _active.OnEnter(this);
    }

    /// <summary>Initialize: OnEnter the root node</summary>
    public void Start()
    {
        _active.OnEnter(this);
    }

    /// <summary>Resolve out fields after construction, then wire cross-references</summary>
    public void WireOuts()
    {
        foreach (var node in _nodeMap.Values)
        {
            if (node is IWireOuts w)
                w.ResolveOuts(_nodeMap);
        }
    }
}

/// <summary>Interface for generated nodes to resolve out port references</summary>
public interface IWireOuts
{
    void ResolveOuts(IReadOnlyDictionary<string, INodeHandler> nodeMap);
}
