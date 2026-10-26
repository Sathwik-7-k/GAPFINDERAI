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
  status: "Focus" | "Building" | "Strong";
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

export const initialDocuments: StudyDocument[] = [
  {
    id: "sample-syllabus",
    title: "Cell biology syllabus.pdf",
    kind: "Syllabus · 8 pages",
    updated: "Added today",
    content: `A LEVEL BIOLOGY · COURSE SYLLABUS\n\nUnit 1: Cell structure\nEukaryotic cells contain a nucleus, mitochondria, ribosomes, endoplasmic reticulum and Golgi apparatus. The nucleus contains DNA and controls the activities of the cell. Mitochondria are the site of aerobic respiration and ATP production. Ribosomes are the site of protein synthesis.\n\nUnit 2: Membrane transport\nThe cell membrane is selectively permeable, controlling which substances enter and leave the cell. It is composed of a phospholipid bilayer with embedded proteins. Diffusion is the net movement of particles from a region of higher concentration to lower concentration, down a concentration gradient. Facilitated diffusion uses channel or carrier proteins and does not require ATP. Active transport moves substances against a concentration gradient using energy from ATP and carrier proteins. Osmosis is the net movement of water molecules across a partially permeable membrane from a region of higher water potential to lower water potential.\n\nUnit 3: Enzymes\nEnzymes are biological catalysts that lower the activation energy of a reaction. The active site has a shape complementary to its substrate. Temperature and pH affect enzyme activity. Each enzyme has an optimum temperature and pH; conditions far from these optima can change the active site and denature the enzyme.\n\nUnit 4: Cellular respiration\nAerobic respiration uses oxygen to release energy from glucose. Glycolysis takes place in the cytoplasm. The link reaction and Krebs cycle occur in the mitochondrial matrix. The electron transport chain is located on the inner mitochondrial membrane. ATP is the immediate energy currency used by cells.\n\nUnit 5: Inheritance\nA gene is a length of DNA that codes for a polypeptide. Alleles are different versions of a gene. Genotype is the alleles an organism possesses; phenotype is the observable characteristic produced by genotype and environment. A dominant allele is expressed in a heterozygote.\n\nAssessment objectives\nStudents should explain biological processes using precise terminology, interpret data, and apply knowledge to unfamiliar contexts. The final paper includes short-answer and extended-response questions.`,
  },
  {
    id: "sample-notes",
    title: "Membranes & transport notes.txt",
    kind: "Class notes · Unit 2",
    updated: "Added today",
    content: `UNIT 2 · MEMBRANES AND TRANSPORT\n\nThe fluid mosaic model\nThe phospholipid bilayer forms the basic structure of the membrane. Hydrophilic phosphate heads face the watery environments inside and outside the cell. Hydrophobic fatty acid tails point inwards, away from water. Proteins are embedded in the bilayer and can move laterally, which is why the model is described as fluid.\n\nComparing transport mechanisms\nSimple diffusion needs no transport protein and no ATP. It moves small molecules down their concentration gradient. Facilitated diffusion also moves substances down a gradient, but channel or carrier proteins help molecules that cannot pass through the lipid bilayer directly. Active transport uses carrier proteins and energy from ATP to move substances against their concentration gradient.\n\nExam reminder\nDo not describe osmosis as the movement of solute. Osmosis is the movement of water molecules through a partially permeable membrane, from higher water potential to lower water potential. For a full explanation, identify the direction of water movement and refer to the water potential gradient.\n\nCommon misconception\nFacilitated diffusion is passive: it does not use ATP. The presence of a membrane protein does not by itself mean a process is active transport.`,
  },
  {
    id: "sample-paper",
    title: "Biology past paper · 2024.txt",
    kind: "Past paper · Paper 1",
    updated: "Added yesterday",
    content: `BIOLOGY PAPER 1 · SELECTED QUESTIONS\n\nQuestion 4 · Cell membranes\nA student placed potato cylinders in sucrose solutions of different concentrations. Explain how osmosis causes a change in the mass of a potato cylinder. In your answer, refer to water potential and the partially permeable cell-surface membrane. [4 marks]\n\nQuestion 7 · Enzymes\nThe rate of an enzyme-controlled reaction was measured at different temperatures. Describe the effect of increasing temperature up to the enzyme's optimum and explain why the rate falls above the optimum. [5 marks]\n\nQuestion 9 · Respiration\nExplain why mitochondria are adapted for aerobic respiration. [3 marks]\n\nMark scheme extract\nFor osmosis: water moves from higher to lower water potential; across a partially permeable membrane; into or out of the potato cells depending on the solution. For enzymes: increasing temperature increases kinetic energy and successful collisions up to the optimum; above the optimum bonds in the enzyme structure are disrupted and the active site changes shape.`,
  },
];

export const initialTopics: StudyTopic[] = [
  { id: "membrane", name: "Membrane transport", unit: "UNIT 2 · CELLS", mastery: 42, status: "Focus", reason: "Mixes up facilitated diffusion and active transport.", source: "Membranes & transport notes", evidence: "2 diagnostic answers · 1 past paper" },
  { id: "respiration", name: "Cellular respiration", unit: "UNIT 4 · ENERGY", mastery: 61, status: "Building", reason: "Strong on glycolysis; review where later stages happen.", source: "Cell biology syllabus", evidence: "1 diagnostic answer · syllabus" },
  { id: "enzymes", name: "Enzymes", unit: "UNIT 3 · MOLECULES", mastery: 74, status: "Building", reason: "Can describe the active site; practise denaturation questions.", source: "Biology past paper · 2024", evidence: "2 diagnostic answers · 1 past paper" },
  { id: "genetics", name: "Inheritance", unit: "UNIT 5 · GENETICS", mastery: 84, status: "Strong", reason: "Consistent understanding of genotype and phenotype.", source: "Cell biology syllabus", evidence: "3 diagnostic answers · syllabus" },
  { id: "structure", name: "Cell structure", unit: "UNIT 1 · CELLS", mastery: 91, status: "Strong", reason: "Accurate recall of organelles and their functions.", source: "Cell biology syllabus", evidence: "3 diagnostic answers · syllabus" },
];

export const initialTasks: StudyTask[] = [
  { id: "task-1", title: "Diffusion vs. active transport", topic: "Membrane transport", duration: "25 min", priority: "High", description: "Sort three transport examples, then explain what makes each one passive or active.", done: false },
  { id: "task-2", title: "Osmosis: water potential", topic: "Membrane transport", duration: "20 min", priority: "High", description: "Review the exam reminder in your notes and answer the potato-cylinder question.", done: false },
  { id: "task-3", title: "Trace the stages of respiration", topic: "Cellular respiration", duration: "20 min", priority: "Medium", description: "Place glycolysis, the link reaction, Krebs cycle and electron transport in the right location.", done: false },
  { id: "task-4", title: "Enzyme temperature curve", topic: "Enzymes", duration: "25 min", priority: "Medium", description: "Explain the rate change on either side of an enzyme’s optimum temperature.", done: false },
  { id: "task-5", title: "Mixed retrieval check", topic: "All mapped topics", duration: "30 min", priority: "Low", description: "Finish with a short mixed check and see which topics are ready to maintain.", done: false },
];