export type AgentTool =
  | { name: "navigate"; arguments: { url: string } }
  | { name: "click"; arguments: { x: number; y: number } }
  | { name: "move"; arguments: { x: number; y: number } }
  | { name: "type"; arguments: { text: string } }
  | { name: "scroll"; arguments: { deltaY: number } }
  | { name: "wait"; arguments: { ms: number } };

export type AgentStepResult = {
  thought?: string;            // optional (if model provides)
  tools: AgentTool[];          // ordered tool calls
  final?: string;              // optional user-facing summary
};
