export interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  iconName: string;
  accentFrom: string;
  accentTo: string;
  imageUrl: string;
}

export const onboardingSlides: OnboardingSlide[] = [
  {
    id: 'discover',
    title: 'Watch what you love',
    subtitle: 'Endless Videos',
    description:
      'Discover videos from creators around the world. From gaming to cooking, technology to music — your next favorite is one tap away.',
    iconName: 'PlayCircle',
    accentFrom: '#7C3AED',
    accentTo: '#A855F7',
    imageUrl:
      'https://images.pexels.com/photos/2156881/pexels-photo-2156881.jpeg?auto=compress&cs=tinysrgb&w=900&h=1200&fit=crop',
  },
  {
    id: 'create',
    title: 'Create and share',
    subtitle: 'Become a Creator',
    description:
      'Upload your videos, build your audience, and grow your channel. StoryVerse gives you the tools to share your passion with the world.',
    iconName: 'Video',
    accentFrom: '#4C1D95',
    accentTo: '#7C3AED',
    imageUrl:
      'https://images.pexels.com/photos/110854/pexels-photo-110854.jpeg?auto=compress&cs=tinysrgb&w=900&h=1200&fit=crop',
  },
  {
    id: 'community',
    title: 'Join the community',
    subtitle: 'Connect & Engage',
    description:
      'Follow your favorite creators, like and comment on videos, and build your own library of saved content. Be part of the conversation.',
    iconName: 'Users',
    accentFrom: '#9333EA',
    accentTo: '#C084FC',
    imageUrl:
      'https://images.pexels.com/photos/1438761/pexels-photo-1438761.jpeg?auto=compress&cs=tinysrgb&w=900&h=1200&fit=crop',
  },
];
