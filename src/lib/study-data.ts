export type StudyDocument = {
  id: string;
  title: string;
  kind: string;
  updated: string;
  content: string;
};

export type StudyTopic = {
  id: string;
  name: string;
  unit: string;
  mastery: number;
  status: "Unassessed" | "Focus" | "Building" | "Strong";
  reason: string;
  source: string;
  evidence: string;
};

export type StudyTask = {
  id: string;
  title: string;
  topic: string;
  duration: string;
  priority: "High" | "Medium" | "Low";
  description: string;
  done: boolean;
};