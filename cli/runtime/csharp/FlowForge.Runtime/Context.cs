namespace FlowForge.Runtime;

public class Context
{
    /// <summary>Shared variable blackboard</summary>
    public readonly Dictionary<string, object?> Variables = new();

    /// <summary>Host interface for engine callbacks</summary>
    public readonly IHostInterface Host;

    /// <summary>Current time (seconds) since flow start</summary>
    public float Time => Host.CurrentTime;

    public Context(IHostInterface host)
    {
        Host = host;
    }

    /// <summary>Get typed variable from blackboard, with optional fallback</summary>
    public T GetVariable<T>(string key, T fallback = default!)
    {
        if (Variables.TryGetValue(key, out var val) && val is T t)
            return t;
        return fallback;
    }
}
