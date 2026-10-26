import type { StudyDocument, StudyTask, StudyTopic } from "@/lib/study-data";
import type { WorkspaceSnapshot } from "@/lib/workspace-db";

export const SAMPLE_DOCUMENT_CONTENT = `# Process Management & CPU Scheduling
Process management is a fundamental responsibility of modern operating systems. A process is a program in execution, represented by a Process Control Block (PCB) which stores the program counter, registers, memory limits, and open files.
Processes transition through several states: New, Ready, Running, Waiting, and Terminated.
CPU scheduling determines which process in the ready queue is allocated the CPU.
Common scheduling algorithms include:
1. First-Come, First-Served (FCFS): Simple but suffers from the convoy effect where short processes wait behind long CPU-bound processes.
2. Shortest Job Next (SJN/SJF): Minimizes average waiting time but is difficult to predict in practice and can starve long jobs.
3. Round Robin (RR): Allocates a fixed time quantum (slice) to each process in circular order. If the time quantum is too large, RR behaves like FCFS; if too small, frequent context switching degrades throughput.
4. Multilevel Feedback Queue (MLFQ): Dynamically adjusts process priorities based on observed CPU burst behavior, penalizing CPU-heavy processes while prioritizing I/O-bound interactive tasks.

# Memory Hierarchy & Virtual Memory
Virtual memory decouples the programmer's logical address space from physical memory (DRAM), allowing processes to execute without being completely loaded in RAM.
Logical addresses are divided into a page number and an offset. The Memory Management Unit (MMU) uses the page table to translate logical pages into physical frames.
To accelerate translation, modern processors use a hardware cache called the Translation Lookaside Buffer (TLB). On a TLB hit, translation takes 1 clock cycle; on a TLB miss, a page table walk is required.
When a requested page is not in physical RAM, a page fault occurs:
1. The hardware traps to the OS kernel.
2. The OS checks if the reference was valid.
3. A free physical frame is located.
4. The missing page is fetched from secondary swap storage.
5. The page table and TLB are updated, and the instruction restarts.
When memory is full, page replacement algorithms choose which frame to evict:
- FIFO: Frequently suffers from Belady's Anomaly where allocating more physical frames increases page faults.
- Least Recently Used (LRU): Highly effective approximation of optimal replacement, tracking usage timestamps.
- Clock Algorithm: An efficient approximation of LRU using a single reference bit.
If a system spends more time servicing page faults than executing instructions, it enters thrashing, causing performance to collapse.

# Concurrency, Mutexes & Semaphores
Concurrent execution occurs when multiple threads or processes execute simultaneously or interleave on a single CPU core.
When multiple threads access shared mutable data without proper synchronization, race conditions arise, leading to non-deterministic bugs.
The Critical Section Problem requires solutions to satisfy three core criteria:
1. Mutual Exclusion: At most one thread can enter the critical section at any given time.
2. Progress: If no process is executing in its critical section, only processes not in remainder sections can participate in deciding who enters next.
3. Bounded Waiting: A limit exists on the number of times other processes can enter before a process's request is granted.
Synchronization primitives include:
- Mutex Locks: Binary flags owned by a single thread providing mutual exclusion with acquire() and release() methods.
- Semaphores: Integer variables proposed by Dijkstra. Wait() decrements the counter and blocks if negative; signal() increments and unblocks waiting threads. Binary semaphores act like mutexes, while counting semaphores manage finite resource pools (e.g., bounded buffers).

# Deadlock Detection & Prevention
A deadlock occurs when a set of concurrent processes are permanently blocked because each process holds a resource while waiting for another resource held by another process.
All four Coffman conditions must hold simultaneously for a deadlock to exist:
1. Mutual Exclusion: At least one resource is held in a non-shareable mode.
2. Hold and Wait: A process holds at least one resource and waits to acquire additional resources held by other processes.
3. No Preemption: Resources cannot be forcibly taken from a process until it voluntarily releases them.
4. Circular Wait: A closed chain of processes exists where each process waits for a resource held by the next process in the chain.
Deadlock handling approaches include:
- Prevention: Structurally eliminating one of the four Coffman conditions (e.g., strictly ordering all resource acquisitions by ID to eliminate Circular Wait).
- Avoidance: Dynamically analyzing resource requests using algorithms like Dijkstra's Banker's Algorithm, which verifies whether granting a request maintains a 'safe state' with at least one viable execution order.
- Detection and Recovery: Periodically scanning Resource Allocation Graphs for cycles and aborting processes or preempting resources to resolve deadlocks.

# Storage & File System Architecture
File systems provide structured, persistent storage over raw disk blocks.
The Unix Inode (Index Node) contains metadata about a file (permissions, owner, size, timestamps) and pointers to data blocks.
To efficiently support both tiny files and multi-gigabyte files, standard inodes use multi-level indexing:
- Direct Pointers: Direct references to initial data blocks (e.g., 12 direct pointers for fast access to small files).
- Single Indirect Pointer: Points to a block containing pointers to data blocks.
- Double and Triple Indirect Pointers: Provide hierarchical expansion for very large files.
Crash consistency is maintained using Journaling: changes are committed sequentially to an append-only log before modifying the primary file system structures, preventing corruption during power failure.`;

export const SAMPLE_WORKSPACE: WorkspaceSnapshot = {
  documents: [
    {
      id: "doc-os-core",
      title: "Operating Systems & Systems Architecture",
      kind: "Syllabus & Lecture Notes",
      updated: "Just now",
      content: SAMPLE_DOCUMENT_CONTENT,
    },
  ],
  topics: [
    {
      id: "topic-sched",
      name: "Process Scheduling & Context Switching",
      unit: "UNIT 1: PROCESSES",
      mastery: 85,
      status: "Strong",
      reason: "Demonstrated strong understanding of Round Robin time quantums and MLFQ priority decay.",
      source: "Operating Systems & Systems Architecture",
      evidence: "Answered Round Robin and convoy effect questions accurately in diagnostic.",
    },
    {
      id: "topic-vmem",
      name: "Virtual Memory & Paging Mechanisms",
      unit: "UNIT 2: MEMORY",
      mastery: 42,
      status: "Focus",
      reason: "Needs focus: Missed questions on TLB miss penalties and Multi-level page table lookups.",
      source: "Operating Systems & Systems Architecture",
      evidence: "Struggled with the 5-step page fault trap sequence and thrashing recovery.",
    },
    {
      id: "topic-sync",
      name: "Concurrency & Synchronization Primitives",
      unit: "UNIT 3: CONCURRENCY",
      mastery: 70,
      status: "Building",
      reason: "Building confidence: Understands Mutex locks but needs practice with counting semaphores.",
      source: "Operating Systems & Systems Architecture",
      evidence: "Correct on mutual exclusion principles; confused semaphore wait/signal edge cases.",
    },
    {
      id: "topic-deadlock",
      name: "Deadlock Conditions & Banker's Algorithm",
      unit: "UNIT 4: DEADLOCKS",
      mastery: 36,
      status: "Focus",
      reason: "Needs focus: High-priority gap in Coffman conditions and safe state verification.",
      source: "Operating Systems & Systems Architecture",
      evidence: "Failed Banker's Algorithm allocation vector calculation on recent check.",
    },
    {
      id: "topic-storage",
      name: "Storage & File System Architecture",
      unit: "UNIT 5: STORAGE",
      mastery: 92,
      status: "Strong",
      reason: "Strong mastery: Thorough understanding of Unix Inodes, direct/indirect pointers, and journaling.",
      source: "Operating Systems & Systems Architecture",
      evidence: "Consistently accurate on file allocation and crash consistency questions.",
    },
  ],
  tasks: [
    {
      id: "task-1",
      title: "Master Banker's Algorithm Safe State Calculation",
      topic: "Deadlock Conditions & Banker's Algorithm",
      duration: "25 min",
      priority: "High",
      description: "Review Coffman conditions and practice matrix allocation calculations from Unit 4 notes.",
      done: false,
    },
    {
      id: "task-2",
      title: "Step-by-Step Page Fault & TLB Walk Review",
      topic: "Virtual Memory & Paging Mechanisms",
      duration: "20 min",
      priority: "High",
      description: "Trace address translation through TLB hit/miss and the kernel page fault handler.",
      done: false,
    },
    {
      id: "task-3",
      title: "Producer-Consumer Bounded Buffer with Semaphores",
      topic: "Concurrency & Synchronization Primitives",
      duration: "15 min",
      priority: "Medium",
      description: "Revisit counting semaphore wait() and signal() placement to prevent race conditions.",
      done: true,
    },
    {
      id: "task-4",
      title: "Quick Verify: Round Robin Time Quantum Trade-offs",
      topic: "Process Scheduling & Context Switching",
      duration: "10 min",
      priority: "Low",
      description: "Verify throughput trade-offs between large quantums (convoy effect) and small quantums (context switch overhead).",
      done: true,
    },
  ],
  attempts: 2,
  analyticsOptIn: true,
};
