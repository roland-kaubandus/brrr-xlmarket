"use client"

import NextLink from "next/link"
import { useRef, type ComponentProps, type MouseEvent } from "react"

type SafeLinkProps = ComponentProps<typeof NextLink>

const NAV_THROTTLE_MS = 300

export default function SafeLink({ onClick, ...rest }: SafeLinkProps) {
  const lastNavRef = useRef(0)

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    const now = Date.now()
    if (now - lastNavRef.current < NAV_THROTTLE_MS) {
      e.preventDefault()
      return
    }
    lastNavRef.current = now

    if (onClick) {
      ;(onClick as (e: MouseEvent<HTMLAnchorElement>) => void)(e)
    }
  }

  return <NextLink prefetch={false} onClick={handleClick} {...rest} />
}
