import { signIn, useSession } from "next-auth/react";
import { Container } from "./Container";

export const LoggedOutBanner = () => {
  const { data: session } = useSession();

  if (session) {
    return null;
  }

  return (
    <div className="fixed bottom-0 w-full bg-primary p-4">
      <Container classNames="bg-transparent flex justify-between">
        <p className="text-white">Do not miss out</p>

        <div>
          <button
            className="py-2 px-4 text-white shadow-md"
            onClick={() => signIn()}
          >
            Sign in
          </button>
        </div>
      </Container>
    </div>
  );
};
