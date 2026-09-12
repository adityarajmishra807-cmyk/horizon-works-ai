import React from 'react';
import { ArrowUp, BrainCircuit, Loader2, Sparkles } from 'lucide-react';
import { getOrganizedRecords, type OrganizationAction } from './horizon-organization';
import { getMemories, type HorizonMemory } from './horizon-memory';
import { type HorizonToolCall } from './horizon-tools';
import { hydrateAudit, recordAudit } from './horizon-audit';
import { buildAgentInstruction, executeAgentTools, routeHorizonAgent } from './horizon-agents';

type Prospect = { id: string; name: string; handle: string; niche: string; score: number | null; status: string; reply: string; time: string };
type HorizonResponse = { ok: boolean; text?: string; error?: string; organization?: { actions?: OrganizationAction[]; memories?: Array<Omit<HorizonMemory, 'id' | 'createdAt' | 'updatedAt'>> } };
type Message = { role: 'user' | 'assistant'; text: string };

export function HorizonAI({ prospects }: { prospects: Prospect[] }) {
  const [input, setInput] = React.useState('');
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [notice, setNotice] = React.useState('');
  const [agentName, setAgentName] = React.useState('Horizon');
  const [savedNotice, setSavedNotice] = React.useState('');

  React.useEffect(() => { void hydrateAudit(); }, []);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setNotice('');
    setSavedNotice('');
    setMessages((current) => [...current, { role: 'user', text }]);
    setLoading(true);

    const agent = routeHorizonAgent(text);
    setAgentName(agent.name);
    recordAudit({ kind: 'ai_request', action: 'ai_request', summary: `${agent.name} started processing a request.`, metadata: { length: text.length, agent: agent.id } });

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: buildAgentInstruction(agent, text),
          context: {
            workspace: 'Horizon Works',
            prospects: prospects.map(({ id: _id, ...prospect }) => prospect),
            counts: {
              prospects: prospects.length,
              sent: prospects.filter((prospect) => ['Sent', 'Replied', 'Interested', 'Not interested'].includes(prospect.status)).length,
              replies: prospects.filter((prospect) => ['Replied', 'Interested', 'Not interested'].includes(prospect.status)).length,
              interested: prospects.filter((prospect) => prospect.status === 'Interested').length,
            },
            organizedRecords: getOrganizedRecords().slice(0, 40),
            memories: getMemories().slice(0, 40),
            agent: { id: agent.id, name: agent.name, tools: agent.tools },
          },
        }),
      });

      const data = (await response.json()) as HorizonResponse;
      if (!response.ok || !data.ok) throw new Error(data.error || 'Horizon could not process that request.');

      const organization = data.organization;
      const toolCalls: HorizonToolCall[] = [];
      if (organization?.actions?.length) toolCalls.push({ name: 'organize_records', arguments: { actions: organization.actions } });
      for (const memory of organization?.memories || []) if (memory.content?.trim()) toolCalls.push({ name: 'save_memory', arguments: memory });

      const toolResults = executeAgentTools(agent, toolCalls);
      const created = toolResults.reduce((sum, result) => sum + (result.data && typeof result.data === 'object' && 'created' in result.data ? Number((result.data as { created?: number }).created || 0) : 0), 0);
      const updated = toolResults.reduce((sum, result) => sum + (result.data && typeof result.data === 'object' && 'updated' in result.data ? Number((result.data as { updated?: number }).updated || 0) : 0), 0);
      const memoryCount = toolCalls.filter((call) => call.name === 'save_memory').length;
      const details = created || updated || memoryCount ? ` Saved ${memoryCount ? `${memoryCount} memor${memoryCount === 1 ? 'y' : 'ies'}` : 'workspace context'}${created || updated ? ` · ${created} created · ${updated} updated` : ''}.` : '';

      setMessages((current) => [...current, { role: 'assistant', text: `${data.text || 'Done.'}${details}` }]);
      if (created || updated || memoryCount) setSavedNotice('Workspace updated');
      recordAudit({ kind: 'ai_request', action: 'ai_request_completed', summary: `${agent.name} completed the request.`, metadata: { tools: toolCalls.length, created, updated, memories: memoryCount, agent: agent.id } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Horizon AI is unavailable right now.';
      setNotice(message);
      recordAudit({ kind: 'error', action: 'ai_request', summary: message, metadata: { ok: false, agent: agent.id } });
    } finally {
      setLoading(false);
    }
  }

  return <section className="horizon-ai-page" aria-label="Horizon AI">
    <header className="horizon-header">
      <div className="horizon-brand">
        <div className="horizon-brand-mark"><BrainCircuit size={17} /></div>
        <div><div className="horizon-brand-name">Horizon AI</div><div className="horizon-brand-state"><span /> Gemini connected</div></div>
      </div>
      <div className="horizon-agent-state">{agentName}</div>
    </header>

    <main className="horizon-chat">
      {messages.length === 0 ? <div className="horizon-empty"><div className="horizon-empty-icon"><Sparkles size={17} /></div><h1>What are we working on?</h1><p>Tell me what happened, what you need, or what you want to plan.</p></div> : <div className="horizon-messages" aria-live="polite">
        {messages.map((message, index) => <article className={`horizon-message ${message.role}`} key={`${message.role}-${index}`}><div className="horizon-message-role">{message.role === 'user' ? 'You' : 'Horizon'}</div><div className="horizon-message-text">{message.text}</div></article>)}
        {loading && <article className="horizon-message assistant"><div className="horizon-message-role">Horizon</div><div className="horizon-thinking"><Loader2 size={15} className="spin" /> Thinking…</div></article>}
      </div>}
    </main>

    <footer className="horizon-compose-wrap">
      {notice && <div className="horizon-error">{notice}</div>}
      {savedNotice && <div className="horizon-saved">{savedNotice}</div>}
      <form className="horizon-composer" onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Message Horizon…" rows={1} aria-label="Message Horizon AI" />
        <button type="submit" disabled={loading || !input.trim()} aria-label="Send message">{loading ? <Loader2 size={17} className="spin" /> : <ArrowUp size={17} />}</button>
      </form>
      <div className="horizon-compose-note">Horizon remembers important context and organizes work automatically.</div>
    </footer>
  </section>;
}
