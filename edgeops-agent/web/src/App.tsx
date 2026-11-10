import { FormEvent, useRef } from "react";
import { useAgent } from "agents/react";
import { getToolApproval, useAgentChat } from "@cloudflare/ai-chat/react";

function readable(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const agent = useAgent({
    agent: "EdgeOpsAgent",
    name: import.meta.env.VITE_AGENT_INSTANCE || "local-operator"
  });

  const {
    messages,
    sendMessage,
    clearHistory,
    addToolApprovalResponse,
    status
  } = useAgentChat({ agent });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = inputRef.current?.value.trim();
    if (!text || status === "streaming") return;
    sendMessage({ text });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">EDGE CONFIG SERVICE</p>
          <h1>EdgeOps Agent</h1>
          <p className="subhead">Inspect and propose configuration changes in natural language.</p>
        </div>
        <span className={`status ${status === "streaming" ? "busy" : ""}`}>
          {status === "streaming" ? "Thinking" : "Connected"}
        </span>
      </header>

      <section className="notice">
        <strong>Safe by design</strong>
        <span>Reads are automatic. Every config write requires your approval and is checked for stale data.</span>
      </section>

      <section className="chat" aria-live="polite">
        {messages.length === 0 && (
          <div className="welcome">
            <h2>What would you like to inspect?</h2>
            <div className="examples">
              <button onClick={() => sendMessage({ text: "List the configuration keys." })}>List config keys</button>
              <button onClick={() => sendMessage({ text: "Show the current value for payment.timeout." })}>Inspect a key</button>
              <button onClick={() => sendMessage({ text: "Propose changing payment.timeout to 30." })}>Propose a change</button>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <article className={`message ${message.role}`} key={message.id}>
            <div className="role">{message.role === "assistant" ? "EDGEOPS" : "YOU"}</div>
            {message.parts.map((part, index) => {
              if (part.type === "text") {
                return <p className="message-text" key={`${message.id}-${index}`}>{part.text}</p>;
              }

              if ("state" in part && part.state === "approval-requested") {
                const approval = getToolApproval(part);
                if (!approval) return null;
                return (
                  <div className="approval" key={part.toolCallId}>
                    <div className="approval-title">Approval required</div>
                    <p>Approve the configuration write below?</p>
                    <pre>{readable(part.input)}</pre>
                    <div className="actions">
                      <button className="approve" onClick={() => addToolApprovalResponse({ id: approval.id, approved: true })}>Approve write</button>
                      <button className="reject" onClick={() => addToolApprovalResponse({ id: approval.id, approved: false })}>Reject</button>
                    </div>
                  </div>
                );
              }

              if ("state" in part && part.state === "output-available") {
                return (
                  <details className="tool-result" key={part.toolCallId}>
                    <summary>{part.toolName} result</summary>
                    <pre>{readable(part.output)}</pre>
                  </details>
                );
              }

              return null;
            })}
          </article>
        ))}
      </section>

      <form className="composer" onSubmit={submit}>
        <input
          ref={inputRef}
          name="message"
          autoComplete="off"
          placeholder="Ask about a config key or propose a change..."
          aria-label="Message EdgeOps Agent"
        />
        <button type="submit" disabled={status === "streaming"}>Send</button>
      </form>
      <footer>
        <span>Connected to the configured Edge Config Service</span>
        <button className="clear" onClick={clearHistory}>Clear conversation</button>
      </footer>
    </main>
  );
}
