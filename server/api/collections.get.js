// server/api/collections.get.js


import {
  defineEventHandler,
  getRequestHeader,
  createError,
  getQuery
} from 'h3'

import { prisma } from '@/server/prisma'

export default defineEventHandler(async (event) => {
  // 1. Authenticate user
  const cookie = getRequestHeader(event, 'cookie') || ''
  let me
  try {
    me = await $fetch('/api/auth/me', { headers: { cookie } })
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const userId = me?.id
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // 2. Read page query (default to 1)
  const { page: pageRaw } = getQuery(event) || {}
  const page = parseInt(pageRaw, 10) || 1
  const take = 200
  const skip = (page - 1) * take

  try {
    // 3. Fetch UserCtoons + nested Ctoon + only ACTIVE auctions
    const userCtoons = await prisma.userCtoon.findMany({
      where: { userId },
      include: {
        ctoon:   true,
        auctions: {
          where: { status: 'ACTIVE' }
        }
      },
      skip,
      take,
      orderBy: { createdAt: 'asc' }
    })

    // 4. Map → include auctions array
    return userCtoons.map((uc) => ({
      id:              uc.id,
      userId:          uc.userId,
      name:            uc.ctoon.name,
      set:             uc.ctoon.set,
      series:          uc.ctoon.series,
      type:            uc.ctoon.type,
      rarity:          uc.ctoon.rarity,
      assetPath:       uc.ctoon.assetPath,
      releaseDate:     uc.ctoon.releaseDate,
      price:           uc.ctoon.price,
      initialQuantity: uc.ctoon.initialQuantity,
      quantity:        uc.ctoon.quantity,
      characters:      uc.ctoon.characters,
      mintNumber:      uc.mintNumber,
      isFirstEdition:  uc.isFirstEdition,
      // pass through the auctions array (empty if none)
      auctions:        uc.auctions || []
    }))
  } catch (err) {
    console.error('Error fetching user collections (paginated):', err)
    return []
  }
})
