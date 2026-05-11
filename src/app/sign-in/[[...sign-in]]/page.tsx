import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 text-center mb-2">
          Find My Business
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center mb-8">
          Sign in to access the lookup tool.
        </p>
        <div className="flex justify-center">
          <SignIn />
        </div>
      </div>
    </div>
  );
}
