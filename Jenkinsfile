pipeline {
    agent any
    stages {
        stage("Checkout") {
            steps {
                git url: 'https://github.com/m-browntown/Pixi.git'
            }
        }
        
        stage("42C Security Audit") {
            steps {
                audit credentialsId: '42CrunchAPIToken', logLevel: 'DEBUG', minScore: 5, platformUrl: 'https://demolabs.42crunch.cloud'
            }
        }
    }
}