type IconProps = {
  name: string;
  size?: number;
  color?: string;
  className?: string;
};

export default function Icon({name,size  =19, className, color}: IconProps) {
  return (
    <span
      className={`material-symbols-rounded inline-block leading-none whitespace-nowrap ${className}`}
      aria-hidden="true"
      style={{ fontSize: size}}
    >
      {name}
    </span>
  );
}