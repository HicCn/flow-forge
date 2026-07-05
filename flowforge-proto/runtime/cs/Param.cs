using System.Text.Json;

namespace FlowForge.Runtime;

/// <summary>
/// Wraps a node parameter value with its source metadata.
/// </summary>
public class Param<T>
{
    /// <summary>How this parameter gets its value ("fixed" or "param").</summary>
    public string Source { get; }

    /// <summary>The resolved value.</summary>
    public T Value { get; }

    /// <summary>When <see cref="Source"/> is "param", the key in the shared parameter table.</summary>
    public string? ParamKey { get; }

    public Param(string source, T value, string? paramKey = null)
    {
        Source = source;
        Value = value;
        ParamKey = paramKey;
    }

    public override string ToString() => Value?.ToString() ?? "";
}
