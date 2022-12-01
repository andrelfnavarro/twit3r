import { useState } from "react";
import { z } from "zod";
import { trpc } from "../utils/trpc";

export const tweetSchema = z.object({
  text: z
    .string({
      required_error: "Tweet required is required",
    })
    .min(10)
    .max(280),
});

export const CreateTweet = () => {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const utils = trpc.useContext();

  const { mutateAsync } = trpc.tweet.create.useMutation({
    onSuccess: () => {
      setText("");

      utils.tweet.timeline.invalidate();
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      tweetSchema.parse({ text });
    } catch (error) {
      if (error instanceof z.ZodError) {
        setError(error.issues[0]!.message);
      }
      return;
    }

    return mutateAsync({ text });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col rounded-md border-b-2 border-gray-500 p-4"
    >
      {JSON.stringify(error)}
      <textarea
        className="w-full p-4 shadow"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's happening?"
      />

      <div className="mt-4 ml-auto">
        <button
          className="rounded-md bg-primary px-4 py-2 text-white"
          type="submit"
        >
          Tweet
        </button>
      </div>
    </form>
  );
};
