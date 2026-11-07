import type {BoardType} from "~/lib/types/types";
import {type QueryClient, useMutation, useQueryClient} from "@tanstack/react-query";
import {createBoard, deleteBoard, updateBoard} from "~/lib/server/functions/boards";
import {createLabel, deleteLabel, updateLabel} from "~/lib/server/functions/labels";
import {boardDetailsOptions, boardsListOptions} from "~/lib/client/react-query/query-options";
import {disconnectGithub, listGithubRepos, syncGithubRepos} from "~/lib/server/functions/github";
import {createColumn, deleteColumn, moveColumn, updateColumn} from "~/lib/server/functions/columns";
import {bulkUpdateCards, addLabelToCard, createCard, deleteCard, moveCard, removeLabelFromCard, updateCardContent, updateCardTitle} from "~/lib/server/functions/cards";


const invalidateBoardsList = (queryClient: QueryClient) => {
    void queryClient.invalidateQueries({ queryKey: boardsListOptions.queryKey });
};


const invalidateBoardDetails = (queryClient: QueryClient, boardId: number) => {
    invalidateBoardsList(queryClient);
    return queryClient.invalidateQueries({ queryKey: boardDetailsOptions(boardId).queryKey });
};


const updateBoardCache = (queryClient: QueryClient, boardId: number, update: (board: BoardType) => BoardType) => {
    queryClient.setQueryData(boardDetailsOptions(boardId).queryKey, (board) => board ? update(board) : board);
};


// --- BOARDS LIST ----------------------------------------------------

export const useCreateBoardMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createBoard,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: boardsListOptions.queryKey }),
    });
};


export const useUpdateBoardMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateBoard,
        onSuccess: (data) => {
            void queryClient.invalidateQueries({ queryKey: boardsListOptions.queryKey });
            updateBoardCache(queryClient, data.id, (board) => ({ ...board, ...data }));
        }
    })
};


export const useDeleteBoardMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteBoard,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: boardsListOptions.queryKey }),
    });
};


// --- COLUMNS --------------------------------------------------------

export const useCreateColumnMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createColumn,
        onSuccess: (data) => {
            invalidateBoardsList(queryClient);
            updateBoardCache(queryClient, data.boardId, (board) => ({
                ...board,
                columns: [...board.columns, data],
            }));
        }
    })
};


export const useUpdateColumnMutation = (boardId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateColumn,
        onMutate: async (variables) => {
            await queryClient.cancelQueries({ queryKey: boardDetailsOptions(boardId).queryKey });

            updateBoardCache(queryClient, boardId, (board) => ({
                ...board,
                columns: board.columns.map(col =>
                    col.id === variables.data.id ? { ...col, ...variables.data } : col
                ),
            }));
        },
        onSuccess: (data) => {
            updateBoardCache(queryClient, boardId, (board) => ({
                ...board,
                columns: board.columns.map((column) => column.id === data.id ? { ...column, ...data } : column),
            }));
        },
        onSettled: () => invalidateBoardDetails(queryClient, boardId),
    })
};


export const useMoveColumnMutation = (boardId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: moveColumn,
        onSuccess: (positions) => {
            const positionsById = new Map(positions.map((position) => [position.id, position.order]));

            updateBoardCache(queryClient, boardId, (board) => ({
                ...board,
                columns: board.columns.map((column) => {
                    const order = positionsById.get(column.id);
                    return order === undefined ? column : { ...column, order };
                }),
            }));
        },
        onSettled: () => invalidateBoardDetails(queryClient, boardId),
    });
};


export const useDeleteColumnMutation = (boardId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteColumn,
        onSuccess: (_data, variables) => {
            invalidateBoardsList(queryClient);
            updateBoardCache(queryClient, boardId, (board) => ({
                ...board,
                cards: board.cards.filter((card) => card.columnId !== variables.data.id),
                columns: board.columns.filter((column) => column.id !== variables.data.id),
            }));
        },
    })
};


// --- CARDS ------------------------------------------------------

export const useCreateCardMutation = (boardId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createCard,
        onSuccess: (data) => {
            invalidateBoardsList(queryClient);
            updateBoardCache(queryClient, boardId, (board) => ({
                ...board,
                cards: [...board.cards, data],
            }));
        }
    })
};


export const useMoveCardMutation = (boardId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: moveCard,
        onSuccess: (positions) => {
            const positionsById = new Map(positions.map((position) => [position.id, position]));

            updateBoardCache(queryClient, boardId, (board) => ({
                ...board,
                cards: board.cards.map((card) => {
                    const position = positionsById.get(card.id);
                    return position ? { ...card, ...position } : card;
                }),
            }));
        },
        onSettled: () => invalidateBoardDetails(queryClient, boardId),
    })
};


export const useUpdateCardTitleMutation = (boardId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateCardTitle,
        onSuccess: (data) => {
            invalidateBoardsList(queryClient);
            updateBoardCache(queryClient, boardId, (board) => ({
                ...board,
                cards: board.cards.map((card) => card.id === data.id ? { ...card, ...data } : card),
            }));
        },
    })
};


export const useUpdateCardContentMutation = (boardId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateCardContent,
        onSuccess: (data) => {
            invalidateBoardsList(queryClient);
            updateBoardCache(queryClient, boardId, (board) => ({
                ...board,
                cards: board.cards.map((card) =>
                    card.id === data.id ? { ...card, ...data } : card
                ),
            }));
        },
    })
};


export const useDeleteCardMutation = (boardId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteCard,
        onSuccess: (_data, variables) => {
            invalidateBoardsList(queryClient);
            updateBoardCache(queryClient, boardId, (board) => ({
                ...board,
                cards: board.cards.filter((card) => card.id !== variables.data.id),
            }));
        },
    })
};


export const useAddLabelToCardMutation = (boardId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: addLabelToCard,
        onSuccess: (data, variables) => {
            invalidateBoardsList(queryClient);
            updateBoardCache(queryClient, boardId, (board) => ({
                ...board,
                cards: board.cards.map((card) => card.id === variables.data.cardId
                    ? { ...card, labels: [...card.labels, data] }
                    : card),
            }));
        },
    })
};


export const useRemoveLabelFromCardMutation = (boardId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: removeLabelFromCard,
        onSuccess: (_data, variables) => {
            invalidateBoardsList(queryClient);
            updateBoardCache(queryClient, boardId, (board) => ({
                ...board,
                cards: board.cards.map((card) => card.id === variables.data.cardId ?
                    { ...card, labels: card.labels.filter((l) => l.id !== variables.data.labelId) } : card
                ),
            }));
        },
    })
};


// --- LABELS ----------------------------------------------------

export const useCreateLabelMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createLabel,
        onSuccess: (data) => {
            invalidateBoardsList(queryClient);
            updateBoardCache(queryClient, data.boardId, (board) => ({
                ...board,
                labels: [...board.labels, data],
            }));
        },
    });
};


export const useUpdateLabelMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateLabel,
        onSuccess: (data) => {
            invalidateBoardsList(queryClient);
            updateBoardCache(queryClient, data.boardId, (board) => ({
                ...board,
                labels: board.labels.map((label) => label.id === data.id ? data : label),
                cards: board.cards.map((card) => ({
                    ...card,
                    labels: card.labels.map((label) => label.id === data.id ? data : label),
                })),
            }));
        },
    })
};


export const useDeleteLabelMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteLabel,
        onSuccess: (_data, variables) => {
            invalidateBoardsList(queryClient);
            updateBoardCache(queryClient, variables.data.boardId, (board) => ({
                ...board,
                labels: board.labels.filter((label) => label.id !== variables.data.id),
                cards: board.cards.map((card) => ({
                    ...card,
                    labels: card.labels.filter((label) => label.id !== variables.data.id),
                })),
            }));
        },
    });
};


// --- GITHUB ---------------------------------------------------------------------

export const useListGithubReposMutation = (boardId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: listGithubRepos,
        onSuccess: () => invalidateBoardDetails(queryClient, boardId),
        onSettled: (_data, _error, variables) => {
            // Mutation variables remain cached after completion, including on failure.
            delete variables.data.token;
        },
    });
};


export const useSyncGithubReposMutation = (boardId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: syncGithubRepos,
        onSuccess: () => invalidateBoardDetails(queryClient, boardId),
    });
};


export const useDisconnectGithubMutation = (boardId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: disconnectGithub,
        onSuccess: () => invalidateBoardDetails(queryClient, boardId),
    });
};


// --- BULK CARDS -----------------------------------------------------------------

export const useBulkUpdateCardsMutation = (boardId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: bulkUpdateCards,
        onSuccess: () => invalidateBoardDetails(queryClient, boardId),
    });
};
