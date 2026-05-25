/**
 * Collision matrix:
 *
 *                               SpeechBubble | food | wall | bodyPart | brush | item
 * SpeechBubble                    ❌            ❌      ✅      ❌       ❌    ❌
 * food                            ❌            ✅      ✅      ❌       ❌    ✅
 * wall                            ✅            ✅      ✅      ✅       ❌    ✅
 * bodyPart                        ❌            ❌      ✅      ❌       ✅    ✅
 * brush                           ❌            ❌      ❌      ✅       ❌    ❌
 * item                            ❌            ✅      ✅      ✅       ❌    ✅
 *
 * Legend: ❌ = geen collision, ✅ = collide
 */

export const CATEGORY_BORDER_POINT = 0x0001
export const CATEGORY_FOOD         = 0x0002
export const CATEGORY_WALL         = 0x0004
export const CATEGORY_BODY_PART    = 0x0008
export const CATEGORY_BRUSH        = 0x0010
export const CATEGORY_ITEM         = 0x0012

// export const MASK_BODY_PART = CATEGORY_WALL | CATEGORY_FOOD

// collisionFilters per type
export const collisionBorderPoint = {
    category: CATEGORY_BORDER_POINT,
    mask: 0 // bots met niemand
}

export const collisionFood = {
    category: CATEGORY_FOOD,
    mask: CATEGORY_FOOD | CATEGORY_WALL | CATEGORY_ITEM
}

export const collisionWall = {
    category: CATEGORY_WALL,
    mask: 0xFFFF // bots met alles
}

export const collisionBodyPart = {
    category: CATEGORY_BODY_PART,
    mask: CATEGORY_WALL | CATEGORY_FOOD | CATEGORY_BRUSH | CATEGORY_ITEM
}

export const collisionBrush = {
    category: CATEGORY_BRUSH,
    mask: CATEGORY_BODY_PART
}

export const collisionItem = {
    category: CATEGORY_ITEM,
    mask: CATEGORY_WALL | CATEGORY_FOOD | CATEGORY_BODY_PART,
}