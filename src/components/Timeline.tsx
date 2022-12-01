import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AiFillHeart } from "react-icons/ai";

import type { RouterInputs, RouterOutputs } from "../utils/trpc";
import { trpc } from "../utils/trpc";
import { CreateTweet } from "./CreateTweet";

const LIMIT = 10;

const useScrollPosition = () => {
  const [scrollPosition, setScrollPosition] = useState(0);

  const handleScroll = () => {
    const height =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;

    const winScroll =
      document.body.scrollTop || document.documentElement.scrollTop;

    const scrolled = (winScroll / height) * 100;

    setScrollPosition(scrolled);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return scrollPosition;
};

export const Timeline = ({
  where = {},
}: {
  where?: RouterInputs["tweet"]["timeline"]["where"];
}) => {
  const { data, hasNextPage, fetchNextPage, isFetching } =
    trpc.tweet.timeline.useInfiniteQuery(
      {
        limit: LIMIT,
        where,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  const queryClient = useQueryClient();

  const tweets = data?.pages.flatMap((page) => page.tweets) ?? [];
  const scrollPosition = useScrollPosition();

  useEffect(() => {
    if (scrollPosition > 90 && hasNextPage && !isFetching) {
      fetchNextPage();
    }
  }, [scrollPosition, hasNextPage, fetchNextPage, isFetching]);

  return (
    <div>
      <CreateTweet />

      {tweets.map((tweet) => (
        <Tweet
          key={tweet.id}
          tweet={tweet}
          queryClient={queryClient}
          input={{
            where,
            limit: LIMIT,
          }}
        />
      ))}

      <p className="text-center">
        {isFetching
          ? "Loading..."
          : hasNextPage
          ? "Fetching more..."
          : "No more tweets to load"}
      </p>
    </div>
  );
};

const updateCache = ({
  client,
  variables,
  data,
  action,
  input,
}: {
  client: QueryClient;
  variables: {
    tweetId: string;
  };
  data: {
    userId: string;
  };
  action: "like" | "unlike";
  input: RouterInputs["tweet"]["timeline"];
}) => {
  client.setQueryData(
    [
      ["tweet", "timeline"],
      {
        input,
        type: "infinite",
      },
    ],
    (oldData) => {
      console.log(oldData);

      const newData = oldData as InfiniteData<
        RouterOutputs["tweet"]["timeline"]
      >;

      const newTweets = newData.pages.map((page) => {
        return {
          tweets: page.tweets.map((tweet) => {
            if (tweet.id === variables.tweetId) {
              return {
                ...tweet,
                likes: action === "like" ? [data.userId] : [],
                _count: {
                  likes:
                    action === "like"
                      ? tweet._count.likes + 1
                      : tweet._count.likes - 1,
                },
              };
            }

            return tweet;
          }),
        };
      });

      return {
        ...newData,
        pages: newTweets,
      };
    }
  );
};

const Tweet = ({
  tweet,
  queryClient,
  input,
}: {
  tweet: RouterOutputs["tweet"]["timeline"]["tweets"][number];
  queryClient: QueryClient;
  input: RouterInputs["tweet"]["timeline"];
}) => {
  const likeMutation = trpc.tweet.like.useMutation({
    onSuccess: (data, variables) => {
      updateCache({
        client: queryClient,
        variables,
        data,
        action: "like",
        input,
      });
    },
  }).mutateAsync;
  const unlikeMutation = trpc.tweet.unlike.useMutation({
    onSuccess: (data, variables) => {
      updateCache({
        client: queryClient,
        variables,
        data,
        action: "unlike",
        input,
      });
    },
  }).mutateAsync;
  const formattedCreatedAt = formatDistanceToNow(new Date(tweet.createdAt), {
    addSuffix: true,
  });

  const hasLiked = tweet.likes.length > 0;

  const handleHeartClick = async () => {
    if (hasLiked) {
      return unlikeMutation({ tweetId: tweet.id });
    }

    return likeMutation({ tweetId: tweet.id });
  };

  return (
    <div className="border-b-2 border-gray-500 p-2">
      <div className="mb-2 flex">
        <Image
          src={tweet.author.image ?? ""}
          width={48}
          height={48}
          alt={`${tweet.author.name}'s avatar`}
          className="rounded-full object-top"
        />

        <div className="ml-2">
          <strong>
            <Link href={`/${tweet.author.name}`}>{tweet.author.name}</Link>
          </strong>
          <time className="text-sm text-gray-500"> - {formattedCreatedAt}</time>

          <p>{tweet.text}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center">
        <AiFillHeart
          color={hasLiked ? "red" : "gray"}
          size="1.5rem"
          onClick={handleHeartClick}
        />
        <span className="text-sm text-gray-700">{tweet._count.likes}</span>
      </div>
    </div>
  );
};
