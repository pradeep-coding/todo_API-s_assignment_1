const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
const { format } = require("date-fns");
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let database = null;

const initializeServerAndDb = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000);
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeServerAndDb();

const convertToResponseDb = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    category: dbObject.category,
    priority: dbObject.priority,
    status: dbObject.status,
    dueDate: dbObject.due_date,
  };
};

const hasPriorityPropertyAndStatusProperty = (queryParam) => {
  return queryParam.status !== undefined && queryParam.priority !== undefined;
};

const hasPriorityProperty = (queryParam) => {
  return (
    queryParam.priority !== undefined &&
    queryParam.category === undefined &&
    queryParam.status === undefined
  );
};

const hasStatusProperty = (queryParam) => {
  return (
    queryParam.status !== undefined &&
    queryParam.category === undefined &&
    queryParam.priority === undefined
  );
};

const hasSearchQProperty = (queryParam) => {
  return queryParam.search_q !== undefined;
};

const hasCategoryAndStatusProperty = (queryParam) => {
  return queryParam.category !== undefined && queryParam.status !== undefined;
};

const hasCategoryProperty = (queryParam) => {
  return (
    queryParam.category !== undefined &&
    queryParam.priority === undefined &&
    queryParam.status === undefined
  );
};

const hasCategoryAndPriorityProperty = (queryParam) => {
  return queryParam.category !== undefined && queryParam.priority !== undefined;
};

app.get("/todos/", async (request, response) => {
  let getTodoQuery = null;
  let data = null;
  const { search_q = "", priority, status, category } = request.query;
  let error = null;
  switch (true) {
    case hasStatusProperty(request.query):
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        getTodoQuery = `SELECT *
                    FROM todo
                    WHERE status = '${status}';`;
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case hasPriorityProperty(request.query):
      if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
        getTodoQuery = `SELECT *
                            FROM todo
                            WHERE priority = '${priority}';`;
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case hasPriorityPropertyAndStatusProperty(request.query):
      if (
        (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") &&
        (status === "TO DO" || status === "IN PROGRESS" || status === "DONE")
      ) {
        getTodoQuery = `SELECT *
                                FROM todo
                                WHERE status = '${status}'
                                AND priority = '${priority}';`;
      } else {
        if (
          priority !== "HIGH" ||
          priority !== "MEDIUM" ||
          priority !== "LOW"
        ) {
          error = "Invalid Todo Priority";
        } else {
          error = "Invalid Todo Status";
        }
        response.status(400);
        response.send(error);
      }
      break;
    case hasSearchQProperty(request.query):
      getTodoQuery = `SELECT *
                        FROM todo
                        WHERE todo LIKE '%${search_q}%'`;
      break;
    case hasCategoryAndStatusProperty(request.query):
      if (
        (category === "HOME" ||
          category === "WORK" ||
          category === "LEARNING") &&
        (status === "TO DO" || status === "IN PROGRESS" || status === "DONE")
      ) {
        getTodoQuery = `SELECT *
                                FROM todo
                                WHERE status = '${status}'
                                AND category = '${category}';`;
      } else {
        if (
          category !== "HOME" ||
          category !== "WORK" ||
          category !== "LEARNING"
        ) {
          error = "Invalid Todo Category";
        } else {
          error = "Invalid Todo Status";
        }
        response.status(400);
        response.send(error);
      }
      break;
    case hasCategoryProperty(request.query):
      if (
        category === "HOME" ||
        category === "WORK" ||
        category === "LEARNING"
      ) {
        getTodoQuery = `SELECT *
                            FROM todo
                            WHERE category = '${category}';`;
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case hasCategoryAndPriorityProperty(request.query):
      if (
        (category === "HOME" ||
          category === "WORK" ||
          category === "LEARNING") &&
        (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW")
      ) {
        getTodoQuery = `SELECT *
                                FROM todo
                                WHERE priority = '${priority}'
                                AND category = '${category}';`;
      } else {
        if (
          category !== "HOME" ||
          category !== "WORK" ||
          category !== "LEARNING"
        ) {
          error = "Invalid Todo Category";
        } else {
          error = "Invalid Todo Priority";
        }
        response.status(400);
        response.send(error);
      }
      break;
  }
  data = await database.all(getTodoQuery);
  response.send(data.map((eachData) => convertToResponseDb(eachData)));
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `SELECT *
                            FROM todo
                            WHERE id = ${todoId};`;
  const data = await database.get(getTodoQuery);
  response.send(convertToResponseDb(data));
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;

  try {
    const newDate = format(new Date(date), "yyyy-MM-dd");
    const getTodoQuery = `SELECT *
                            FROM todo
                            WHERE due_date = '${newDate}';`;
    const data = await database.all(getTodoQuery);
    response.send(data.map((eachData) => convertToResponseDb(eachData)));
  } catch {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, category, status, dueDate } = request.body;
  switch (true) {
    case priority !== undefined:
      if (
        !(priority === "HIGH" || priority === "MEDIUM" || priority === "LOW")
      ) {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
    case category !== undefined:
      if (
        !(category === "HOME" || category === "WORK" || category === "LEARNING")
      ) {
        response.status(400);
        response.send("Invalid Todo Category");
      }
    case status !== undefined:
      if (
        !(status === "TO DO" || status === "IN PROGRESS" || status === "DONE")
      ) {
        response.status(400);
        response.send("Invalid Todo Status");
      }

    case dueDate !== undefined:
      try {
        const newDate = format(new Date(dueDate), "yyyy-MM-dd");
        updateStatus = "Due Date";
      } catch {
        response.status(400);
        response.send("Invalid Due Date");
      }

    default:
      const insertTodoQuery = `INSERT INTO todo
                                (id,todo, category, priority, status, due_date)
                            VALUES (${id}, '${todo}', '${category}', '${priority}', '${status}', '${dueDate}');`;
      await database.run(insertTodoQuery);
      response.send("Todo Successfully Added");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateStatus = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.status !== undefined:
      if (
        requestBody.status === "TO DO" ||
        requestBody.status === "IN PROGRESS" ||
        requestBody.status === "DONE"
      ) {
        updateStatus = "Status";
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case requestBody.priority !== undefined:
      if (
        requestBody.priority === "HIGH" ||
        requestBody.priority === "MEDIUM" ||
        requestBody.priority === "LOW"
      ) {
        updateStatus = "Priority";
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }

      break;
    case requestBody.todo !== undefined:
      updateStatus = "Todo";
      break;
    case requestBody.category !== undefined:
      if (
        requestBody.category === "HOME" ||
        requestBody.category === "WORK" ||
        requestBody.category === "LEARNING"
      ) {
        updateStatus = "Category";
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }

      break;
    case requestBody.dueDate !== undefined:
      try {
        const newDate = format(new Date(requestBody.dueDate), "yyyy-MM-dd");
        updateStatus = "Due Date";
      } catch {
        response.status(400);
        response.send("Invalid Due Date");
      }

      break;
  }

  const previousTodo = `SELECT *
                        FROM todo
                        WHERE id = ${todoId}`;
  const previousTodoItem = await database.get(previousTodo);

  const {
    todo = previousTodoItem.todo,
    priority = previousTodoItem.priority,
    status = previousTodoItem.status,
    category = previousTodoItem.category,
    id = previousTodoItem.id,
    date = previousTodoItem.due_date,
  } = request.body;
  const updateTodoQuery = `UPDATE todo
                        SET id = ${id},
                            todo = '${todo}',
                            priority = '${priority}',
                            status = '${status}',
                            category = '${category}',
                            due_date = '${date}'

                        WHERE id = ${todoId};`;
  await database.run(updateTodoQuery);
  response.send(`${updateStatus} Updated`);
});

app.delete("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `DELETE FROM todo
                                WHERE id = ${todoId};`;
  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
