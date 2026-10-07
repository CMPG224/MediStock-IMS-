import Header from "@/components/app-shell/Header";
import UsersView from "@/components/users/UsersView";

export default function UsersPage() {
  return (
    <>
      <Header searchPlaceholder="Search user directory..." />
      <UsersView />
    </>
  );
}
