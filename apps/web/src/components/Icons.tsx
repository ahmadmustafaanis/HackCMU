import type { ComponentType, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Icon({ title, children, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden={title ? undefined : true} {...rest}>
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function PawMark(props: IconProps) {
  return (
    <Icon {...props}>
      <ellipse cx="8" cy="7.5" rx="2.1" ry="2.6" fill="currentColor" />
      <ellipse cx="12" cy="5.4" rx="2.1" ry="2.6" fill="currentColor" />
      <ellipse cx="16" cy="7.5" rx="2.1" ry="2.6" fill="currentColor" />
      <ellipse cx="18.2" cy="11.4" rx="1.8" ry="2.2" fill="currentColor" />
      <path
        d="M7.2 14.2c1.4-1.8 3.1-2.6 4.8-2.6s3.4.8 4.8 2.6c.9 1.2.7 2.8-.4 3.6-1.5 1.1-3.1 1.8-4.4 1.8s-2.9-.7-4.4-1.8c-1.1-.8-1.3-2.4-.4-3.6Z"
        fill="currentColor"
      />
    </Icon>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 11.2 12 4.8l7.5 6.4" {...stroke} />
      <path d="M6.5 10.8V19h11V10.8" {...stroke} />
    </Icon>
  );
}

export function CompassIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8" {...stroke} />
      <path d="m14.8 9.2-1.4 5.2-5.2 1.4 1.4-5.2z" {...stroke} />
    </Icon>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13 3.5 6.5 13h5l-1 7.5 6.8-10H13z" {...stroke} />
    </Icon>
  );
}

export function PeopleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8.5" r="2.4" {...stroke} />
      <path d="M4.8 18.2c.4-2.6 2.1-4 4.2-4s3.8 1.4 4.2 4" {...stroke} />
      <circle cx="16.2" cy="9.2" r="2" {...stroke} />
      <path d="M15 14.4c1.8.2 3.2 1.4 3.6 3.8" {...stroke} />
    </Icon>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 6.8c0-1.3 1-2.3 2.3-2.3h9.4c1.3 0 2.3 1 2.3 2.3v6.4c0 1.3-1 2.3-2.3 2.3h-6.2l-3.7 3v-3H7.3C6 15.5 5 14.5 5 13.2Z" {...stroke} />
    </Icon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8.2" r="2.6" {...stroke} />
      <path d="M6.2 18.5c.6-3 2.6-4.6 5.8-4.6s5.2 1.6 5.8 4.6" {...stroke} />
    </Icon>
  );
}

export function EatIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 4.5v7.5c0 1.4.8 2.2 2 2.2h0c1.2 0 2-.8 2-2.2V4.5" {...stroke} />
      <path d="M7 14.2V19.5" {...stroke} />
      <path d="M15.5 4.5c2 2.2 2.8 4.6 2.8 7.2 0 2.2-1.2 3.4-2.8 3.4V19.5" {...stroke} />
    </Icon>
  );
}

export function CoffeeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 9h9v5.2c0 2-1.7 3.6-3.8 3.6H10.3C8.2 17.8 6.5 16.2 6.5 14.2Z" {...stroke} />
      <path d="M15.5 10.2h1.8c1.1 0 2 .8 2 1.8s-.9 1.8-2 1.8h-1.8" {...stroke} />
      <path d="M7 19.5h10" {...stroke} />
    </Icon>
  );
}

export function StudyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.8 7.5 12 5.5l7.2 2-7.2 2.2z" {...stroke} />
      <path d="M6.2 9.2v6.3c0 .2 2.4 1.8 5.8 1.8s5.8-1.6 5.8-1.8V9.2" {...stroke} />
    </Icon>
  );
}

export function WalkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="13.2" cy="5.2" r="1.6" {...stroke} />
      <path d="m8 20 2.4-5.2 2.4 1.6 1.4 3.6" {...stroke} />
      <path d="m10.4 14.8 1.6-3.2 3.4 1.4 2.2-2.8" {...stroke} />
    </Icon>
  );
}

export function GymIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 10v4M7 8.5v7M10 10.2v3.6M14 10.2v3.6M17 8.5v7M19.5 10v4M7 12h10" {...stroke} />
    </Icon>
  );
}

export function HangIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="5" width="6.2" height="6.2" rx="1.2" {...stroke} />
      <rect x="12.8" y="12.8" width="6.2" height="6.2" rx="1.2" {...stroke} />
      <path d="M14.2 7.2h4.6v4.6M9.8 16.8H5.2v-4.6" {...stroke} />
    </Icon>
  );
}

export function EventsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4.5" y="6" width="15" height="13.5" rx="2" {...stroke} />
      <path d="M4.5 10h15M8.2 4.5v3M15.8 4.5v3" {...stroke} />
    </Icon>
  );
}

export function MeetIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="9" r="2.3" {...stroke} />
      <circle cx="15.5" cy="9.4" r="2" {...stroke} />
      <path d="M5.4 17.5c.5-2.4 2-3.6 3.6-3.6 1.3 0 2.4.7 3.1 1.8M14 14.2c1.4.1 2.6 1.2 3 3.3" {...stroke} />
    </Icon>
  );
}

export function CodingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4.5" y="5.5" width="15" height="11" rx="1.8" {...stroke} />
      <path d="M8 19.5h8M9.5 10.2 7.8 12l1.7 1.8M14.5 10.2 16.2 12l-1.7 1.8M12.4 9.6l-1.2 4.8" {...stroke} />
    </Icon>
  );
}

export function DrawingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.2 5.2 18.8 9.8 10 18.6H5.4v-4.6z" {...stroke} />
      <path d="M12.6 6.8 17.2 11.4" {...stroke} />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" {...stroke} />
      <path d="m15.8 15.8 4.2 4.2" {...stroke} />
    </Icon>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5 13.6 9H19l-4.4 3.3L16.2 18 12 14.8 7.8 18l1.6-5.7L5 9h5.4z" {...stroke} />
    </Icon>
  );
}

export const ACTIVITY_ICONS: Record<string, ComponentType<IconProps>> = {
  eat: EatIcon,
  coffee: CoffeeIcon,
  study: StudyIcon,
  walk: WalkIcon,
  gym: GymIcon,
  hangout: HangIcon,
  events: EventsIcon,
  meet: MeetIcon,
  coding: CodingIcon,
  drawing: DrawingIcon,
};
