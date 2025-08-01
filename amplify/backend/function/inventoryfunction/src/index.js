import express from "express";
import bodyParser from "body-parser";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import awsServerlessExpress from "aws-serverless-express";
import { createServer } from "http";

const app = express();
app.use(bodyParser.json());

// Initialize DynamoDB
const client = new DynamoDBClient({ region: "us-east-1" });
const db = DynamoDBDocumentClient.from(client);
const tableName = "InventoryTable-dev";

// Create Product
app.post("/create", async (req, res) => {
    try {
        const { productId, name, quantity, price } = req.body;
        const command = new PutCommand({
            TableName: tableName,
            Item: { productId, name, quantity, price },
        });
        await db.send(command);
        res.json({ message: "Item created successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Read Product
app.get("/read/:productId", async (req, res) => {
    try {
        const command = new GetCommand({
            TableName: tableName,
            Key: { productId: req.params.productId },
        });
        const response = await db.send(command);
        res.json(response.Item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Product
app.put("/update/:productId", async (req, res) => {
    try {
        const { quantity, price } = req.body;
        const command = new UpdateCommand({
            TableName: tableName,
            Key: { productId: req.params.productId },
            UpdateExpression: "set quantity = :q, price = :p",
            ExpressionAttributeValues: { ":q": quantity, ":p": price },
            ReturnValues: "UPDATED_NEW",
        });
        const response = await db.send(command);
        res.json(response.Attributes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Product
app.delete("/delete/:productId", async (req, res) => {
    try {
        const command = new DeleteCommand({
            TableName: tableName,
            Key: { productId: req.params.productId },
        });
        await db.send(command);
        res.json({ message: "Item deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List All Products
app.get("/list", async (req, res) => {
    try {
        const command = new ScanCommand({ TableName: tableName });
        const response = await db.send(command);
        res.json(response.Items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lambda handler using aws-serverless-express
const server = createServer(app);
export const handler = (event, context) => {
    return awsServerlessExpress.proxy(server, event, context);
};
