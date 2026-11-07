import type {CardType} from "~/lib/types/types";


export function getCardTitle(card: Pick<CardType, "title" | "repository">) {
    return card.repository && card.title === card.repository.fullName
        ? card.repository.fullName.split("/")[1]
        : card.title;
}
