import _, { ListIterator,PartialShallow,PropertyName, } from "lodash"

export type Block = {
    width: number;
    height: number;
    position: number;
    id: string | number;
}

export type Position = {
    x: number;
    y: number;
    width: number;
    height: number;
    sourceId?: string | number;
    position?: number
    parentPosition?: "right" | "left" | "bottom"
    id?: string | number;
}

type Order = Array<string>

export default class Packer {
    private layoutWidth: number
    private layoutHeight: number
    public blocks: Block[]
    private order: Order
    private autoResize?: "width" | "height"
    private positionOrder: { [key: string]: number }
    private orderByOptions: {
        property: Array<PropertyName | ListIterator<Position, unknown> | PartialShallow<Position>>,
        order: Array<"asc" | "desc">
    }
    private resultPositions: Position[]
    
    constructor(layoutWidth: number, layoutHeight: number, options?: { 
        autoResize?: "width" | "height",
        order?: Order
    }) {
        this.layoutWidth = layoutWidth
        this.layoutHeight = layoutHeight
        this.blocks = []
        this.order = ["position", "parentPosition", "y", "x"]
        this.positionOrder = {
            right: 1,
            bottom: 0,
            left: 2
        }
        this.orderByOptions = {
            property: [],
            order: []
        }
        this.resultPositions = []

        if (options) {
            this.autoResize = options?.autoResize
            this.setOrder(options.order)
        } 

        this.order.forEach(opt => {
            if (opt === "parentPosition") {
                this.orderByOptions.property.push((item: Position) => this.positionOrder[item.parentPosition || "right"])
                this.orderByOptions.order.push("asc")
                return
            }

            this.orderByOptions.property.push(opt as PropertyName)
            this.orderByOptions.order.push("asc")
        })
    }

    private blocksOverlap = (r1:Position | undefined, r2:Position | undefined) => {
        if (r1 === undefined || r2 === undefined) {
            return undefined
        }
        return !(r2.x >= r1.x + r1.width ||
                 r2.x + r2.width <= r1.x ||
                 r2.y >= r1.y + r1.height ||
                 r2.y + r2.height <= r1.y)
    }

    private setOrder(order?: Order | undefined) {
        const defaultOrder = ["position", "y", "parentPosition", "x"]
        
        if (!order) {
            this.order = defaultOrder
            return
        }

        // Validate input value
        const possibleValues = ["position", "y", "parentPosition","x"]

        order.forEach(value => {
            if (!possibleValues.includes(value)) {
                console.warn(`${value} is not a valid order value`)
            }
        })

        this.order = order
    }

    public setBlocks(blocks: Block[], cacheLength = 8) {
        this.blocks = _.map(blocks, (block, index) => {
            if (!block.id) {
                block.id = index
            }
            block.position = index
            return block
        })

        return this.updateLayout(cacheLength)
    }
    public sort(positions: Position[]) {
        this.resultPositions = positions

    }
    public addBlock(block: Block, cacheLength = 8) {
        if (!block.id) {
            throw new Error("Block has no id")
        }
        // if block is already in the blocks array, return
        if (this.blocks.find(b => b.id === block.id)) {
            throw new Error("Block is already in the blocks array")
        }

        block.position = this.blocks.length
        this.blocks.push(block)

        // Gebruik dezelfde logica als updateLayout
        const nextBlock = this.getNextBlock(this.resultPositions, [block], cacheLength)

        if (nextBlock) {
            this.resultPositions.push(nextBlock)
            return nextBlock
        } else {

            const lowestBlock = _.reverse(_.sortBy(this.resultPositions, block => block.y + block.height))[0]
            const lastBlock = this.blocks[this.blocks.length - 1]
            
            if (lowestBlock) {
                this.resultPositions.push({
                    width: lastBlock.width,
                    height: lastBlock.height,
                    x: 0,
                    y: lowestBlock.y + lowestBlock.height,
                    id: lastBlock.id,
                    sourceId: "none"
                })
            }
        }

        // Als er geen volgende blok gevonden wordt, plaats het onderaan
        const lowestBlock = _.reverse(_.sortBy(this.resultPositions, block => block.y + block.height))[0]
        
        if (!lowestBlock) {
            // Als er geen bestaande blokken zijn, plaats het op (0,0)
            const newPosition = {
                width: block.width,
                height: block.height,
                position: block.position,
                x: 0,
                y: 0,
                id: block.id
            }
            this.resultPositions.push(newPosition)
            return newPosition
        }

        // Plaats het nieuwe blok onder het laagste blok
        const newPosition = {
            width: block.width,
            height: block.height,
            x: 0,
            y: lowestBlock.y + lowestBlock.height,
            id: block.id,
            sourceId: "none"
        }

        // Controleer of het binnen de grenzen past
        if (this.autoResize != "height" && newPosition.height + newPosition.y > this.layoutHeight) {
            throw new Error("Block exceeds layout height")
        }

        this.resultPositions.push(newPosition)
        return newPosition
    }

    public updateBlock(updatedBlock: Block) {
        const oldBlock = this.blocks.find((b) => b.id === updatedBlock.id);
        const index = this.blocks.findIndex((b) => b.id === updatedBlock.id);
        if (!oldBlock) {
            throw new Error("Block not found");
        }
        this.blocks[index] = { ...oldBlock, ...updatedBlock };
    }

    private fitRight = (target: Position, inputBlocks: Block[]) => {
        return _.without(_.map(inputBlocks, inputBlock => {
            const newBlock = {
                x: target.x + target.width, 
                y: target.y,
                width: inputBlock.width,
                height: inputBlock.height,
                position: inputBlock.position,
                parentPosition: "right",
                sourceId: target.id,
                id: inputBlock.id
            } as Position
            
            // Validate if inputBlock is within canvas
            if (newBlock.x + newBlock.width > this.layoutWidth) {
                return
            }

            // Check if it is exceeding the height
            if ((this.autoResize != "height") && newBlock.y + newBlock.height > this.layoutHeight) {
                return
            }
        
            return newBlock
        }), undefined) as Position[]
    }

    private fitBottom = (target: Position, inputBlocks: Block[]) => {
        return _.without(_.map(inputBlocks, inputBlock => {
            const newBlock = {
                x: target.x,
                y: target.y + target.height,
                width: inputBlock.width,
                height: inputBlock.height,
                parentPosition: "bottom",
                position: inputBlock.position,
                sourceId: target.id,
                id: inputBlock.id
            } as Position

            // Validate if inputBlock is within canvas
            if (newBlock.x + newBlock.width > this.layoutWidth) {
                return
            }
            
            // Check if it is exceeding the height
            if ((this.autoResize != "height") && newBlock.y + newBlock.height > this.layoutHeight) {
                return
            }
                
            return newBlock
        }), undefined) as Position[]
    }

    private fitLeft = (target: Position, inputBlocks: Block[]) => {
        return _.without(_.map(inputBlocks, inputBlock => {
            const newBlock = {
                x: target.x,
                y: target.y,
                width: inputBlock.width,
                height: inputBlock.height,
                position: inputBlock.position,
                parentPosition: "left",
                sourceId: target.id,
                id: inputBlock.id
            } as Position

            // Validate if inputBlock is within canvas
            if ((target.x - inputBlock.width < 0 || newBlock.x + newBlock.width > this.layoutWidth)) {
                return
            }

            // Check if it is exceeding the height
            if ((this.autoResize != "height") && newBlock.y + newBlock.height > this.layoutHeight) {
                return
            }
            
            return newBlock
        }), undefined) as Position[]
    }

    private getOptions = (targetBlock: Position, inputBlocks: Block[]) => {
        const optionsRight = this.fitRight(targetBlock, inputBlocks)
        const optionsLeft = this.fitLeft(targetBlock, inputBlocks)
        const optionsBottom = this.fitBottom(targetBlock, inputBlocks)

        return [
            ...optionsRight,
            ...optionsLeft,
            ...optionsBottom
        ]   
    }

    private getNextBlock = (resultPositions: Position[], inputBlocks: Block[], cacheLength: number) => {
        const options = [];
        let startI = resultPositions.length - cacheLength < 0 ? 0 : resultPositions.length - cacheLength

        for (let i = startI; i < resultPositions.length; i++) {
            const resBlock = resultPositions[i];
            const data = this.getOptions(resBlock, inputBlocks).filter(Boolean);
        
            // Sort positions by y and by custom parent position order
            const sortedData = _.orderBy(
                data,
                [ "y", item => this.positionOrder[item?.parentPosition || "right"]],
                ["asc", "asc"]
            );
        
            // Adjust positions to avoid overlaps
            for (const tempPos of sortedData) {
                for (const pos of resultPositions.sort((a, b) => a.y - b.y)) {
                    if (this.blocksOverlap(tempPos, pos)) {
                        tempPos.y = pos.y + pos.height;
                    }
                }
                options.push(tempPos);
            }
        }
    
        const nextBlocks = _(options)
            .flatten()
            .compact() // Removes undefined values
            .uniqBy(item => `${item.x},${item.y},${item.id}`)
            .orderBy(this.orderByOptions.property, this.orderByOptions.order)
            .value() as Array<Position>

        if (nextBlocks.length >= 1)  {
            return nextBlocks[0]
        } 
        return undefined
    }

    public updateLayout(cacheLength = 8, startIndex = 0) {
        console.info("%cUpdating layout", "background-color: #0f9; color: #333; padding: 4px 8px;")
        console.time("updateLayout")
        this.resultPositions = this.resultPositions.slice(0, startIndex)

        // Loop through resultPositions and only add blocks with an id
        const inputBlocks = [] as Block[]
        this.blocks.forEach((block, index) => {
            if (index >= startIndex) {
                inputBlocks.push(block)
            }
        })
        
        let done = false
        if (inputBlocks.length <= 0) {
            throw new Error("No blocks to layout")
        }
        
        while (!done) {
            if (this.resultPositions.length === 0) {
                const firstBlock = inputBlocks[0] // Get and remove the first block
                if (!firstBlock.width) {
                    // Skip when block doesn't have a width
                    done = true
                    continue
                }
                if (firstBlock) {
                    this.resultPositions.push({
                        width: firstBlock.width,
                        height: firstBlock.height,
                        position: firstBlock.position,
                        x: 0,
                        y: 0,
                        id: firstBlock.id
                    })

                    _.remove(inputBlocks, { id: firstBlock.id })
                }
                continue // Restart loop to process the next block
            }
            
            let nextBlock = this.getNextBlock(this.resultPositions, inputBlocks, cacheLength)

            if (!nextBlock) {
                const lowestBlock = _.reverse(_.sortBy(this.resultPositions, block => block.y + block.height))[0]
                const lastBlock = inputBlocks[0]
                
                if (!lastBlock) {
                    done = true
                    continue
                }

                // Safety check to prevent infinite loops
                if (lastBlock.width <= 0) {
                    done = true
                    continue
                }

                nextBlock = {
                    width: lastBlock.width,
                    height: lastBlock.height,
                    x: 0,
                    y: lowestBlock.y + lowestBlock.height,
                    id: lastBlock.id,
                    sourceId: "none"
                }
            }
            
            // Quit method if layout isn't allowed to be stretched
            if (this.autoResize != "height" && nextBlock.height + nextBlock.y > this.layoutHeight) {
                done = true
                continue
            }
            
            this.resultPositions.push({
                x: nextBlock.x,
                y: nextBlock.y,
                width: nextBlock.width,
                height: nextBlock.height,
                id: nextBlock.id
            })
            _.remove(inputBlocks, { id: nextBlock.id })
            continue
        }
        
        return this.resultPositions
    }
}

