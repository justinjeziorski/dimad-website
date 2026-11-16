export type XTweetItem = {
  id: string;
  text: string;
  createdAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  impressionCount: number;
};

export type XProfilePayload = {
  userId: string;
  username: string;
  name: string;
  profileImageUrl: string;
  followersCount: number;
  followersDisplay: string;
  followingCount: number;
  followingDisplay: string;
  tweetCount: number;
  tweetDisplay: string;
  connectedAt: string;
  recentTweets: XTweetItem[];
};
