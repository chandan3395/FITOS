import { useEffect, useState } from "react";

const initialsFor = (name = "", fallback = "U") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("") || fallback;

const UserAvatar = ({ user, className = "h-9 w-9", fallback = "U" }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const src = user?.profileImage;

  useEffect(() => setImageFailed(false), [src]);

  return (
    <span
      className={`${className} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-[12px] font-bold text-primary ring-1 ring-primary/20`}
      aria-label={user?.name ? `${user.name} profile photo` : "User profile"}
    >
      {src && !imageFailed ? (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initialsFor(user?.name, fallback)}</span>
      )}
    </span>
  );
};

export default UserAvatar;
