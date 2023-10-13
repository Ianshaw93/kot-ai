import requests

def ask_wolfram(question):
    app_id = 'YOUR_APP_ID'  # replace with your Wolfram Alpha app id
    base_url = "http://api.wolframalpha.com/v2/query?input={}&appid={}"
    response = requests.get(base_url.format(question, app_id))
    return response.text

if __name__ == "__main__":
    question = input("Enter your question: ")
    print(ask_wolfram(question))
