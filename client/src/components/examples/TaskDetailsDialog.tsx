import { useState } from "react";
import TaskDetailsDialog from "../TaskDetailsDialog";
import { Button } from "@/components/ui/button";

export default function TaskDetailsDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open Task Details</Button>
      <TaskDetailsDialog
        open={open}
        onOpenChange={setOpen}
        taskTitle="CI green for main branch"
        taskId="task-1"
      />
    </div>
  );
}
