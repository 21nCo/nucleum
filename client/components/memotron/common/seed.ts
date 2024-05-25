import {
  CurationType,
  type CurationThumbnail
} from "$lib/client/types/memotron/curation.type";
import { offsetDate } from "$lib/client/utils/time.utils";

export const curationsSeedDataAr: CurationThumbnail[] = [
  {
    id: "collection:1",
    label: "Appsenal",
    isStarred: true,
    type: CurationType.COLLECTION,
    itemCount: 96,
    createdAt: offsetDate(new Date(), -40).toISOString()
  },
  {
    id: "combination:1",
    label: "Class notes",
    isStarred: true,
    type: CurationType.COMBINATION,
    createdAt: offsetDate(new Date(), -20).toISOString(),
    children: [
      {
        id: "collection:fdsfsf",
        label: "TSE class notes",
        isStarred: true,
        type: CurationType.COLLECTION,
        itemCount: 8,
        createdAt: offsetDate(new Date(), -10).toISOString()
      },
      {
        id: "collection:dfssdfsf",
        label: "LCA class notes",
        isStarred: false,
        type: CurationType.COLLECTION,
        itemCount: 23,
        createdAt: offsetDate(new Date(), -10).toISOString()
      }
    ]
  },
  {
    id: "collection:2",
    label: "Travel diary",
    isStarred: false,
    type: CurationType.COLLECTION,
    itemCount: 114,
    createdAt: offsetDate(new Date(), -10).toISOString()
  },
  {
    id: "combination:2",
    label: "Clumsy",
    isStarred: true,
    type: CurationType.COMBINATION,
    createdAt: new Date().toISOString()
  },
  {
    id: "combination:3",
    label: "Scientia",
    isStarred: false,
    type: CurationType.COMBINATION,
    createdAt: offsetDate(new Date(), -96).toISOString(),
    children: [
      {
        id: "collection:3",
        label: "IO logs",
        isStarred: false,
        type: CurationType.COLLECTION,
        itemCount: 148,
        createdAt: offsetDate(new Date(), -96).toISOString()
      }
    ]
  },
  {
    id: "combination:4",
    label: "Runbook",
    isStarred: false,
    type: CurationType.COMBINATION,
    createdAt: offsetDate(new Date(), -291).toISOString(),
    children: [
      {
        id: "node:4dasdasdf",
        label: "Blank chapter",
        isStarred: false,
        createdAt: offsetDate(new Date(), -245).toISOString()
      }
    ]
  },
  {
    id: "collection:4",
    label: "Blank bucket",
    isStarred: false,
    type: CurationType.COLLECTION,
    itemCount: 23,
    createdAt: offsetDate(new Date(), -245).toISOString()
  }
];
