export type YouTubeVideoItem = {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
};

export type YouTubeChannelPayload = {
  channelId: string;
  channelTitle: string;
  thumbnail: string;
  subscriberCount: number;
  subscriberDisplay: string;
  viewCount: number;
  viewDisplay: string;
  videoCount: number;
  videoDisplay: string;
  connectedAt: string;
  recentVideos: YouTubeVideoItem[];
};
