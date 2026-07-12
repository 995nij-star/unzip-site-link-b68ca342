export type ToolExecution = { tool: string; args: any; result: string };

export type Message = {
  role: "user" | "assistant";
  content: string;
  toolExecutions?: ToolExecution[];
  lang?: string;
};

export type QuickPrompt = {
  label: string;
  icon: any;
  prompt: string;
};

export type QuickPromptCategory = {
  name: string;
  prompts: QuickPrompt[];
};
