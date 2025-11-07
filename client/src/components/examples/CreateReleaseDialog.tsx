import CreateReleaseDialog from "../CreateReleaseDialog";

export default function CreateReleaseDialogExample() {
  return (
    <CreateReleaseDialog
      onCreateRelease={(data) => console.log("Release created:", data)}
    />
  );
}
