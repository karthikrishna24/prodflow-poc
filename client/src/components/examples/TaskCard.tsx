import TaskCard from "../TaskCard";

export default function TaskCardExample() {
  return (
    <div className="w-80 space-y-3">
      <TaskCard
        id="1"
        title="CI green for main branch"
        status="done"
        owner="John Doe"
        required={true}
        priority="P1"
        evidenceCount={2}
        onClick={() => console.log("Task 1 clicked")}
      />
      <TaskCard
        id="2"
        title="Terraform plan reviewed and attached"
        status="doing"
        owner="Jane Smith"
        required={true}
        dueDate="Nov 8, 2025"
        onClick={() => console.log("Task 2 clicked")}
      />
      <TaskCard
        id="3"
        title="Update documentation"
        status="todo"
        owner="Bob Johnson"
        onClick={() => console.log("Task 3 clicked")}
      />
    </div>
  );
}
