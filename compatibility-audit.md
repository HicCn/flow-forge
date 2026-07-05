# FlowForge Editor-Runtime Compatibility Audit

> Date: 2026-07-05 | DSL Version: 1.0

---

## 1. Feature Coverage Matrix

| # | Feature | Editor | Runtime (C#) | Status |
|---|---------|--------|--------------|--------|
| 1 | **Node types** | 7 builtin + custom | 0 handlers implemented | 🔴 Missing |
| 2 | **Parameter system** | fixed / param / param_or_fixed | Param\<T\>.Resolve() | 🟢 OK |
| 3 | **Global parameters** | FlowParameter[] (3 sources) | Variables blackboard (1 source) | 🟡 Partial |
| 4 | **Pins (dynamic)** | Configurable inputs/outputs | Dynamic Handle + SetOut | 🟢 OK |
| 5 | **Edges** | source_pin → target_pin | FlowLoader wires via SetOut | 🟢 OK |
| 6 | **Serialization format** | .flow JSON (see §2) | FlowLoader parses same | 🟢 OK |
| 7 | **flow_call** | target_flow + isInput params | Not implemented | 🔴 Missing |
| 8 | **writes** | WriteDefinition[] per node | No mechanism | 🔴 Missing |
| 9 | **disabled flag** | Per-node boolean | Not checked | 🟡 Partial |
| 10 | **Code generation** | NodeEditModal → definitions | CLI .gen.cs / .gen.ts | 🟢 OK |
| 11 | **Host interface** | (editor simulates UI) | IHostInterface | 🟢 OK |
| 12 | **Flow types** | dialogue / quest / action | Not used | ⚪ N/A |
| 13 | **Validation** | Framework exists, no logic | None | ⚪ N/A |

---

## 2. Serialization Contract

Editor output (`.flow` JSON) and what FlowLoader expects:

```
 Editor serializeDocument()               FlowLoader.Load()
 ─────────────────────────                ──────────────────
 version: "1.0"                           ✅ Read, unused
 meta: { name, flow_type, ... }           ✅ Read, unused
 parameters: [{key, type, default,        ✅ Init Variables from defaults
   source, isInput?, nodeId?, expression?}]
 nodes: [{id, type, position, params,     ✅ Parse nodes, create handlers
   disabled}]                             ⚠️  disabled ignored
 edges: [{source_node, source_pin,        ✅ SetOut(srcPin, tgtNode)
   target_node, target_pin}]
```

**Contract verified: matching field names, structure, and semantics.**

---

## 3. Node Handler Implementation Status

| Node Type | Handler Exists | Core Logic | Host Calls Needed | Gaps |
|-----------|:---:|------------|-------------------|------|
| `flow_start` | ❌ | No-op, Transition to next | — | Trivial |
| `flow_end` | ❌ | Return Complete, stop Tick | — | Trivial |
| `dialogue_line` | ❌ | ShowDialogue → wait click/auto | ShowDialogue, HideDialogue, IsClicked | speaker Resolve, auto_advance logic, writes |
| `branch_choice` | ❌ | PresentChoices → wait → Transition via Out | PresentChoices, IsChoiceReady, SelectedChoice | 3 Out pins (choice_a/b/c) |
| `condition` | ❌ | GetVariable → compare → Transition via Out | GetVariable | Operator eval, T/F outputs |
| `event_trigger` | ❌ | TriggerEvent → Transition | TriggerEvent | Fire-and-forget |
| `flow_call` | ❌ | FlowLoader.Load sub-flow → nested Executor | FlowLoader | Sub-flow wiring, isInput passing |
| `custom_*` | ❌ | User implements partial class | Per definition | Generated stub only |

---

## 4. Runtime Type Gaps

### 4.1 ParamType coverage

| Type | Editor | Runtime TYPE_MAP | Resolve Logic |
|------|--------|-----------------|---------------|
| string | ✅ | ✅ csharp:string, ts:string | ToString or cast |
| number | ✅ | ✅ csharp:int, ts:number | Parse int |
| float | ✅ | ✅ csharp:float, ts:number | Parse float |
| boolean | ✅ | ✅ csharp:bool, ts:boolean | Parse bool |
| enum | ✅ | ✅ (mapped to string) | String comparison OK |
| text | ✅ | ✅ (mapped to string) | String comparison OK |
| **any** | ✅ | ❌ **Not in TYPE_MAP** | Need object/unknown |

### 4.2 PinType coverage

PinType includes `event` and `any` which are not used in builtin node pins. No immediate gap — these are future-use types that the editor supports defining but no node currently uses them.

### 4.3 FlowParameter source types

| Source | Meaning | Runtime Support |
|--------|---------|:---:|
| `flow_input` | External caller provides value | ❌ (flow_call handler needed) |
| `node` | Read value from specific node output | ❌ |
| `expression` | Dynamically compute value | ❌ |

All global parameters currently default to blackboard write without respecting their `source` field.

---

## 5. Writes System Gap

**Editor declares:** Node can have `writes: WriteDefinition[]` (currently only `dialogue_line` declares `writes: [{key: 'speaker', ...}]`).

**Runtime missing:** No mechanism to automatically execute writes. The handler would need to call `ctx.Variables[w.key] = resolvedValue` in its OnTick when transitioning to Complete.

**Required API addition to Context:**
```csharp
public void Write(string key, object? value)
{
    Variables[key] = value;
}
```

The generated `.gen.cs` does NOT reference writes at all. Either:
- (A) Handler manually calls `rt.Ctx.Variables["speaker"] = ...` 
- (B) Generated code auto-executes writes on transition

Recommendation: **(A) for now** — writes are node-specific logic, auto-generation adds complexity without clear benefit at this stage.

---

## 6. flow_call Sub-flow Gap

**Editor supports:** `target_flow` param pointing to another `.flow` file, `isInput` markers on target flow parameters.

**Runtime missing:**
1. No `FlowCallHandler`
2. FlowLoader needs recursive load support for sub-flows
3. `isInput` parameters need passing mechanism
4. Executor needs nested execution support (not currently modeled)

**Required architecture:**
```csharp
// FlowCallHandler.OnEnter:
var subFlowJson = File.ReadAllText(targetPath);
var (subExecutor, _, subCtx) = FlowLoader.Load(subFlowJson, ctx.Host, ...);
// Copy isInput params from this node's params to subCtx.Variables
foreach (var p in subFlowParams.Where(p => p.isInput)) {
    subCtx.Variables[p.key] = resolvedValue;
}
subExecutor.Start();

// FlowCallHandler.OnTick:
var status = subExecutor.Tick(delta);
if (status == NodeStatus.Complete)
    rt.Transition(OutFlow);
return NodeStatus.Running;
```

---

## 7. Condition Handler Requirements

Condition node has params: `variable` (param), `operator` (fixed enum), `compare_value` (fixed string).

**Required logic:**
```csharp
var varName = Variable.Resolve(ctx);       // e.g. "player_hp"
var op = Operator.Resolve(ctx);            // ">="
var cmp = CompareValue.Resolve(ctx);       // "50"

var actual = ctx.GetVariable<float>(varName);
var expected = float.Parse(cmp);

bool result = op switch {
    "==" => actual == expected,
    "!=" => actual != expected,
    ">"  => actual >  expected,
    // ...
};

rt.Transition(result ? OutFlowTrue : OutFlowFalse);
```

**Gap:** Param type for `CompareValue` is string, but comparison needs numeric parsing. Runtime needs `GetVariable<T>` that can coerce string→number.

---

## 8. Missing TypeScript Runtime Core

CLI generates `.gen.ts` files but `cli/runtime/typescript/` does not exist. The TS runtime core files (NodeStatus, IRuntime, Context, IHostInterface, INodeHandler, Param, Executor, FlowLoader) need to be written before generated code can compile.

---

## 9. Summary: Priority Action Items

| Priority | Item | Scope |
|----------|------|-------|
| **P0** | Write 7 builtin NodeHandlers | `cli/runtime/csharp/FlowForge.Runtime/Handlers/` |
| **P0** | Add `any` to TYPE_MAP | `cli/lib/types.cjs` |
| **P1** | Implement flow_call sub-flow support | FlowLoader + FlowCallHandler |
| **P1** | Handle FlowParameter source types (flow_input/node/expression) | Context.cs |
| **P1** | Write TS runtime core files | `cli/runtime/typescript/` |
| **P2** | Support disabled flag in executor | Executor.Tick skips disabled nodes |
| **P2** | Auto-writes mechanism (optional) | Generated code or handler convention |

---

## 10. File Inventory

```
Editor (src/)                    Runtime (cli/)                    Status
─────────────────────────────    ──────────────────────────────    ──────
types/index.ts                   —                                 ✅ Types defined
data/builtinNodes.ts             —                                 ⚠️  Need handler .cs files
components/panels/PropertyPanel  —                                 ✅ Param editing OK
components/modals/NodeEditModal  cli/lib/gen-csharp.cjs            ✅ Gen matches fields
components/layout/AppShell       cli/runtime/.../FlowLoader.cs     ✅ Serialization aligned
store/configStore.ts             cli/lib/types.cjs                 ✅ NodeDefinition consumed
                                 cli/runtime/csharp/               ✅ Core framework
                                 cli/runtime/typescript/           ❌ Missing entirely
```
