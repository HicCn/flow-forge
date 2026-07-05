namespace FlowForge.Runtime;

/// <summary>
/// Wraps a node parameter. Resolve reads from blackboard for 'param' source,
/// or returns the fixed value directly.
/// </summary>
public class Param<T>
{
    private readonly string _source;
    private readonly T _fixedValue;
    private readonly string? _paramKey;

    public Param(string source, T fixedValue, string? paramKey = null)
    {
        _source = source;
        _fixedValue = fixedValue;
        _paramKey = paramKey;
    }

    public T Resolve(Context ctx)
    {
        return _source switch
        {
            "fixed" => _fixedValue,
            "param" => ctx.GetVariable<T>(_paramKey ?? "", _fixedValue),
            "param_or_fixed" => _paramKey != null
                ? ctx.GetVariable<T>(_paramKey, _fixedValue)
                : _fixedValue,
            _ => _fixedValue
        };
    }
}
