import EnvironmentNode from "../EnvironmentNode";

export default function EnvironmentNodeExample() {
  return (
    <div className="flex gap-4">
      <EnvironmentNode
        id="staging"
        name="Staging Environment"
        env="staging"
        status="in_progress"
        tasksCompleted={8}
        tasksTotal={12}
        lastUpdate="1 hour ago"
        onClick={() => console.log("Staging clicked")}
      />
      <EnvironmentNode
        id="uat"
        name="UAT Environment"
        env="uat"
        status="blocked"
        tasksCompleted={3}
        tasksTotal={10}
        lastUpdate="30 mins ago"
        onClick={() => console.log("UAT clicked")}
      />
      <EnvironmentNode
        id="prod"
        name="Production"
        env="prod"
        status="done"
        tasksCompleted={15}
        tasksTotal={15}
        lastUpdate="2 days ago"
        onClick={() => console.log("Production clicked")}
      />
    </div>
  );
}
