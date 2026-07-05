namespace FlowForge.Runtime;

public interface IHostInterface
{
    // ── Dialogue ──
    void ShowDialogue(string text, string speaker, string expression);
    void HideDialogue();

    // ── Choices ──
    void PresentChoices(string[] labels);
    bool IsChoiceReady { get; }
    int SelectedChoice { get; }

    // ── Events ──
    void TriggerEvent(string eventName, string? payload);

    // ── Input ──
    bool IsClicked();

    // ── Time ──
    float CurrentTime { get; }
}
